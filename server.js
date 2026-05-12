const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const chalk = require('chalk');
const fs = require('fs');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);

// 🚀 OPTIMIZED SOCKET.IO
const io = socketIo(server, {
  pingTimeout: 30000,
  pingInterval: 15000,
  maxHttpBufferSize: 5e7,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 🚀 SIMPLE RATE LIMITING (No external deps)
const requestCounts = new Map();
setInterval(() => {
  requestCounts.clear();
}, 60000); // Reset every minute

function checkRateLimit(ip, maxRequests = 100) {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const requests = requestCounts.get(ip).filter(time => time > windowStart);
  requests.push(now);
  requestCounts.set(ip, requests);
  
  return requests.length <= maxRequests;
}

// 🚀 SIMPLE SLOW DOWN
const slowDownMap = new Map();
function checkSlowDown(ip, delayAfter = 50, delayMs = 500) {
  const now = Date.now();
  const windowStart = now - 60000;
  
  if (!slowDownMap.has(ip)) {
    slowDownMap.set(ip, []);
  }
  
  const requests = slowDownMap.get(ip).filter(time => time > windowStart);
  requests.push(now);
  slowDownMap.set(ip, requests);
  
  if (requests.length > delayAfter) {
    return delayMs;
  }
  return 0;
}

// 🚀 MIDDLEWARE
app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ 
      success: false, 
      message: 'Too many requests, please try again later.' 
    });
  }
  
  // Slow down
  const delay = checkSlowDown(clientIP);
  if (delay > 0) {
    setTimeout(next, delay);
  } else {
    next();
  }
});

app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 🚀 OPTIMIZED SESSION MANAGER
class SessionManager {
  constructor() {
    this.pairingSessions = new Map();
    this.socketConnections = new Map();
    this.cleanupInterval = setInterval(() => this.cleanupSessions(), 30000);
    this.maxSessionAge = 2 * 60 * 60 * 1000;
    this.maxInactiveTime = 30 * 60 * 1000;
    this.stats = {
      totalSessions: 0,
      activeSessions: 0,
      memoryUsage: []
    };
  }

  addPairingSession(sessionId, sessionData) {
    this.pairingSessions.set(sessionId, {
      ...sessionData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      activityCount: 0
    });
    this.updateStats();
  }

  getPairingSession(sessionId) {
    const session = this.pairingSessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.activityCount++;
    }
    return session;
  }

  updateSession(sessionId, updates) {
    const session = this.pairingSessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivity: Date.now() });
    }
  }

  removePairingSession(sessionId) {
    this.removeSocketConnection(sessionId);
    this.pairingSessions.delete(sessionId);
    this.updateStats();
  }

  addSocketConnection(sessionId, socketId) {
    this.socketConnections.set(sessionId, {
      socketId,
      connectedAt: Date.now(),
      lastPing: Date.now()
    });
  }

  removeSocketConnection(sessionId) {
    this.socketConnections.delete(sessionId);
  }

  updateSocketPing(sessionId) {
    const connection = this.socketConnections.get(sessionId);
    if (connection) {
      connection.lastPing = Date.now();
    }
  }

  cleanupSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.pairingSessions.entries()) {
      const sessionAge = now - session.createdAt;
      const inactiveTime = now - session.lastActivity;

      if (sessionAge > this.maxSessionAge || inactiveTime > this.maxInactiveTime) {
        this.removePairingSession(sessionId);
        cleanedCount++;
      }
    }

    for (const [sessionId, connection] of this.socketConnections.entries()) {
      if (!this.pairingSessions.has(sessionId)) {
        this.removeSocketConnection(sessionId);
      }
    }

    if (cleanedCount > 0) {
      console.log(chalk.green(`🎯 Cleaned ${cleanedCount} sessions`));
    }

    this.monitorMemoryUsage();
  }

  monitorMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    this.stats.memoryUsage.push(usedMB);
    if (this.stats.memoryUsage.length > 50) this.stats.memoryUsage.shift();

    if (usedMB > 500) {
      console.log(chalk.yellow(`🚨 Memory: ${usedMB}MB`));
      
      if (usedMB > 800) {
        this.forceMemoryCleanup();
      }
    }
  }

  forceMemoryCleanup() {
    console.log(chalk.red(`🚨 CRITICAL MEMORY - Force cleanup`));
    
    const sessions = Array.from(this.pairingSessions.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    const toRemove = Math.max(20, Math.floor(sessions.length * 0.2));
    
    for (let i = 0; i < toRemove && i < sessions.length; i++) {
      this.removePairingSession(sessions[i][0]);
    }
    
    console.log(chalk.green(`🔥 Force cleaned ${toRemove} sessions`));
    
    if (global.gc) global.gc();
  }

  updateStats() {
    this.stats.totalSessions = this.pairingSessions.size;
    this.stats.activeSessions = Array.from(this.pairingSessions.values())
      .filter(s => s.status === 'connected').length;
  }

  getStats() {
    return {
      ...this.stats,
      socketConnections: this.socketConnections.size,
      memoryUsage: process.memoryUsage()
    };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.pairingSessions.clear();
    this.socketConnections.clear();
  }
}

const sessionManager = new SessionManager();
global.activeBots = new Map();
global.pairingSessions = sessionManager.pairingSessions;

// 🚀 OPTIMIZED AUTO-RESTORE
async function autoRestoreSessions() {
  try {
    console.log(chalk.blue('🔄 Restoring sessions...'));
    
    const sessionsDir = path.join(__dirname, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      console.log(chalk.yellow('📁 No sessions directory'));
      return;
    }

    const sessionFolders = fs.readdirSync(sessionsDir);
    console.log(chalk.blue(`📦 Found ${sessionFolders.length} sessions`));

    const maxConcurrent = 2;
    let restoredCount = 0;
    
    for (let i = 0; i < sessionFolders.length; i += maxConcurrent) {
      const batch = sessionFolders.slice(i, i + maxConcurrent);
      await Promise.allSettled(
        batch.map(sessionId => restoreSession(sessionId))
      );
      
      restoredCount += batch.length;
      console.log(chalk.blue(`📊 Restored ${restoredCount}/${sessionFolders.length}`));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(chalk.green(`🎯 Auto-restore completed: ${restoredCount} sessions`));
    
  } catch (error) {
    console.error(chalk.red('❌ Auto-restore error:'), error);
  }
}

async function restoreSession(sessionId) {
  try {
    const sessionDir = path.join(__dirname, 'sessions', sessionId);
    const files = fs.readdirSync(sessionDir);
    const hasAuthFiles = files.some(file => file.includes('creds') || file.includes('app-state'));
    
    if (hasAuthFiles) {
      console.log(chalk.blue(`🔄 Restoring: ${sessionId}`));
      
      const { startBotForSession } = require('./bot-core.js');
      const phoneNumber = '+0000000000';
      
      await startBotForSession(sessionId, phoneNumber);
      return true;
    }
    return false;
  } catch (error) {
    console.error(chalk.red(`❌ Restore failed: ${sessionId}`), error.message);
    return false;
  }
}

// 🚀 ROUTES
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/status', (req, res) => {
  const { getBotManagerStats } = require('./bot-core.js');
  const botStats = getBotManagerStats ? getBotManagerStats() : { totalInstances: 0 };
  const sessionStats = sessionManager.getStats();
  
  res.json({
    status: 'ready',
    totalSessions: sessionStats.totalSessions,
    activeBots: global.activeBots.size,
    botInstances: botStats.totalInstances,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    uptime: process.uptime()
  });
});

// 🚀 OPTIMIZED PAIRING API
const pairingRequests = new Map();
app.post('/api/pair', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Rate limiting
    const now = Date.now();
    const clientData = pairingRequests.get(clientIP) || { requests: [], lastRequest: 0 };
    clientData.requests = clientData.requests.filter(time => now - time < 60000);
    
    if (clientData.requests.length >= 2) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too many requests. Wait 1 minute.' 
      });
    }
    
    clientData.requests.push(now);
    clientData.lastRequest = now;
    pairingRequests.set(clientIP, clientData);
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number required' 
      });
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanNumber.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number' 
      });
    }

    console.log(chalk.blue(`📱 Pairing: +${cleanNumber}`));

    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      phoneNumber: cleanNumber,
      status: 'starting',
      createdAt: Date.now()
    };

    sessionManager.addPairingSession(sessionId, session);
    
    const { startBotForSession } = require('./bot-core.js');
    startBotForSession(sessionId, cleanNumber);

    res.json({ 
      success: true, 
      sessionId: sessionId,
      message: 'Pairing started' 
    });

  } catch (error) {
    console.error(chalk.red('❌ Pairing error:'), error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// 🚀 WEB SOCKETS
io.on('connection', (socket) => {
  console.log(chalk.blue('🔗 Client connected:'), socket.id);

  socket.emit('system-status', getSystemStatus());

  socket.on('join-session', (sessionId) => {
    const session = sessionManager.getPairingSession(sessionId);
    if (session) {
      sessionManager.addSocketConnection(sessionId, socket.id);
      socket.join(sessionId);
      console.log(chalk.blue(`🔗 Joined session: ${sessionId}`));
      socket.emit('session-update', session);
    } else {
      socket.emit('session-error', { message: 'Session not found' });
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', (reason) => {
    console.log(chalk.yellow('🔗 Client disconnected:'), socket.id, reason);
    
    for (const [sessionId, connection] of sessionManager.socketConnections.entries()) {
      if (connection.socketId === socket.id) {
        sessionManager.removeSocketConnection(sessionId);
        break;
      }
    }
  });
});

// 🚀 BROADCAST FUNCTIONS
function broadcastToSession(sessionId, event, data) {
  io.to(sessionId).emit(event, data);
  sessionManager.updateSession(sessionId, {});
}

function generateQRImage(qrData) {
  try {
    return qrcode.toDataURL(qrData);
  } catch (error) {
    return null;
  }
}

function getSystemStatus() {
  const { getBotManagerStats } = require('./bot-core.js');
  const botStats = getBotManagerStats ? getBotManagerStats() : { totalInstances: 0 };
  
  return {
    status: 'ready',
    totalSessions: sessionManager.pairingSessions.size,
    activeBots: global.activeBots.size,
    botInstances: botStats.totalInstances,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  };
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 🚀 CLEANUP
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of pairingRequests.entries()) {
    data.requests = data.requests.filter(time => now - time < 60000);
    if (data.requests.length === 0 && now - data.lastRequest > 120000) {
      pairingRequests.delete(ip);
    }
  }
}, 60000);

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

const { setBroadcastFunctions } = require('./bot-core.js');
setBroadcastFunctions(broadcastToSession, generateQRImage);

server.listen(PORT, () => {
  console.log(chalk.green(`🌐 Server running: http://localhost:${PORT}`));
  console.log(chalk.cyan(`📱 Pairing system ready`));
  
  setTimeout(() => {
    autoRestoreSessions();
  }, 3000);
});

// 🚀 GRACEFUL SHUTDOWN
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🔄 Shutting down...'));
  sessionManager.destroy();
  
  server.close(() => {
    console.log(chalk.green('✅ Server closed'));
    process.exit(0);
  });
  
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

module.exports = { 
  broadcastToSession, 
  generateQRImage,
  app, 
  io,
  sessionManager 
};