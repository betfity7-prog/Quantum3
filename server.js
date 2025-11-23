// server.js - WORKING VERSION WITH SESSION RECOVERY
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const chalk = require('chalk');
const fs = require('fs');
const qrcode = require('qrcode');
const backupManager = require('./backup-manager');
const sessionTracker = require('./session-tracker');
const { startBotForSession, setBroadcastFunctions, getBotManagerStats } = require('./bot-core.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8
});

// Enhanced session storage with automatic cleanup
class SessionManager {
  constructor() {
    this.pairingSessions = new Map();
    this.socketConnections = new Map();
    this.cleanupInterval = setInterval(() => this.cleanupSessions(), 30000);
    this.maxSessionAge = 2 * 60 * 60 * 1000;
    this.maxInactiveTime = 30 * 60 * 1000;
  }

  addPairingSession(sessionId, sessionData) {
    this.pairingSessions.set(sessionId, {
      ...sessionData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      activityCount: 0
    });
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
    const session = this.pairingSessions.get(sessionId);
    if (session) {
      console.log(chalk.yellow(`🗑️  Removing pairing session: ${sessionId}`));
      this.pairingSessions.delete(sessionId);
    }
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
        console.log(chalk.yellow(`🧹 Cleaning old session: ${sessionId}`));
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
      console.log(chalk.green(`🎯 Session cleanup: ${cleanedCount} sessions removed`));
    }

    this.monitorMemoryUsage();
  }

  monitorMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

    if (usedMB > 500) {
      console.log(chalk.yellow(`🚨 High memory usage: ${usedMB}MB / ${totalMB}MB`));
      
      if (usedMB > 800) {
        this.forceMemoryCleanup();
      }
    }
  }

  forceMemoryCleanup() {
    console.log(chalk.red(`🚨 CRITICAL MEMORY - Force cleaning sessions`));
    
    const sessions = Array.from(this.pairingSessions.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    const toRemove = Math.max(50, Math.floor(sessions.length * 0.3));
    
    for (let i = 0; i < toRemove && i < sessions.length; i++) {
      this.removePairingSession(sessions[i][0]);
    }
    
    console.log(chalk.green(`🔥 Force cleaned ${toRemove} sessions`));
    
    if (global.gc) {
      global.gc();
    }
  }

  getStats() {
    return {
      pairingSessions: this.pairingSessions.size,
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

// Initialize enhanced session manager
const sessionManager = new SessionManager();
global.activeBots = new Map();
global.pairingSessions = sessionManager.pairingSessions;

// Auto-restore sessions on startup
async function autoRestoreSessions() {
  try {
    console.log(chalk.blue('🔄 Checking for sessions to restore...'));
    
    const sessionsDir = path.join(__dirname, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      console.log(chalk.yellow('📁 No sessions directory found'));
      return;
    }

    const sessionFolders = fs.readdirSync(sessionsDir);
    console.log(chalk.blue(`📦 Found ${sessionFolders.length} session folders`));

    const maxConcurrentRestores = 3;
    let restoredCount = 0;
    let failedCount = 0;
    
    const restorePromises = [];
    
    for (const sessionId of sessionFolders) {
      if (restoredCount >= 20) {
        console.log(chalk.yellow(`⚠️  Restore limit reached (20), skipping remaining sessions`));
        break;
      }

      if (restorePromises.length >= maxConcurrentRestores) {
        await Promise.race(restorePromises);
      }

      const restorePromise = restoreSession(sessionId).then(success => {
        if (success) restoredCount++;
        else failedCount++;
      });
      
      restorePromises.push(restorePromise);
    }

    await Promise.allSettled(restorePromises);
    
    console.log(chalk.green(`🎯 Auto-restore completed: ${restoredCount} successful, ${failedCount} failed`));
    
  } catch (error) {
    console.error(chalk.red('❌ Auto-restore error:'), error);
  }
}

async function restoreSession(sessionId) {
  try {
    const sessionDir = path.join(__dirname, 'sessions', sessionId);
    const stat = fs.statSync(sessionDir);
    
    if (stat.isDirectory()) {
      const files = fs.readdirSync(sessionDir);
      const hasAuthFiles = files.some(file => 
        file.includes('creds') || file.includes('app-state')
      );
      
      if (hasAuthFiles) {
        console.log(chalk.blue(`🔄 Restoring session: ${sessionId}`));
        
        const trackedSession = sessionTracker.getAllSessions()[sessionId];
        const phoneNumber = trackedSession?.phoneNumber || '+0000000000';
        
        await startBotForSession(sessionId, phoneNumber);
        
        console.log(chalk.green(`✅ Auto-restored: ${sessionId}`));
        return true;
      } else {
        console.log(chalk.yellow(`⚠️  No auth files in: ${sessionId}`));
        return false;
      }
    }
  } catch (error) {
    console.error(chalk.red(`❌ Failed to restore ${sessionId}:`), error.message);
    return false;
  }
}

// Initialize backup system
async function initializeBackupSystem() {
  console.log(chalk.blue('🔄 Initializing backup system...'));
  try {
    await backupManager.initialize();
    console.log(chalk.green('✅ Backup system initialized successfully'));
  } catch (error) {
    console.error(chalk.red('❌ Backup system initialization failed:'), error);
  }
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/status', (req, res) => {
  const botStats = getBotManagerStats ? getBotManagerStats() : { totalInstances: 0 };
  const sessionStats = sessionManager.getStats();
  
  res.json({
    status: 'ready',
    totalSessions: sessionStats.pairingSessions,
    activeBots: global.activeBots.size,
    botInstances: botStats.totalInstances,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    backupStatus: backupManager.getStatus ? backupManager.getStatus() : { initialized: false },
    uptime: process.uptime()
  });
});

// Backup routes
app.get('/api/backup/status', async (req, res) => {
  try {
    const status = backupManager.getStatus ? backupManager.getStatus() : { initialized: false };
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enhanced pairing API with better rate limiting
const pairingRequests = new Map();
app.post('/api/pair', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Improved rate limiting
    const now = Date.now();
    const clientData = pairingRequests.get(clientIP) || { requests: [], lastRequest: 0 };
    
    // Clean old requests
    clientData.requests = clientData.requests.filter(time => now - time < 60000);
    
    if (clientData.requests.length >= 2) {
      return res.status(429).json({ 
        success: false, 
        message: 'Too many pairing requests. Please wait 1 minute.' 
      });
    }
    
    clientData.requests.push(now);
    clientData.lastRequest = now;
    pairingRequests.set(clientIP, clientData);
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
    
    if (cleanNumber.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number' 
      });
    }

    console.log(chalk.blue(`📱 Pairing request: +${cleanNumber}`));

    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      phoneNumber: cleanNumber,
      status: 'starting',
      createdAt: Date.now()
    };

    sessionManager.addPairingSession(sessionId, session);
    startBotForSession(sessionId, cleanNumber);

    res.json({ 
      success: true, 
      sessionId: sessionId,
      message: 'Pairing session started' 
    });

  } catch (error) {
    console.error(chalk.red('❌ Pairing error:'), error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Session APIs
app.get('/api/session/:sessionId', (req, res) => {
  const session = sessionManager.getPairingSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ 
      success: false, 
      message: 'Session not found' 
    });
  }
  res.json({ success: true, session });
});

app.delete('/api/session/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  sessionManager.removePairingSession(sessionId);
  res.json({ success: true, message: 'Session cleaned up' });
});

// WebSocket handlers
io.on('connection', (socket) => {
  console.log(chalk.blue('🔗 Web client connected:'), socket.id);

  socket.emit('system-status', getSystemStatus());

  socket.on('join-session', (sessionId) => {
    const session = sessionManager.getPairingSession(sessionId);
    if (session) {
      sessionManager.addSocketConnection(sessionId, socket.id);
      socket.join(sessionId);
      console.log(chalk.blue(`🔗 Client joined session: ${sessionId}`));
      socket.emit('session-update', session);
    } else {
      socket.emit('session-error', { message: 'Session not found' });
    }
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('backup-session', async (data) => {
    try {
      const { sessionId } = data;
      await backupManager.backupSession(sessionId);
      socket.emit('backup-result', { success: true, sessionId });
    } catch (error) {
      socket.emit('backup-result', { success: false, error: error.message });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(chalk.yellow('🔗 Web client disconnected:'), socket.id, reason);
    
    for (const [sessionId, connection] of sessionManager.socketConnections.entries()) {
      if (connection.socketId === socket.id) {
        sessionManager.removeSocketConnection(sessionId);
        break;
      }
    }
  });
});

// Broadcast functions
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

// Clean up old pairing requests
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of pairingRequests.entries()) {
    data.requests = data.requests.filter(time => now - time < 60000);
    if (data.requests.length === 0 && now - data.lastRequest > 120000) {
      pairingRequests.delete(ip);
    }
  }
}, 60000);

// Start server
const PORT = process.env.PORT || 3000;

// Set broadcast functions
setBroadcastFunctions(broadcastToSession, generateQRImage);

// Initialize and start
initializeBackupSystem().then(() => {
  server.listen(PORT, () => {
    console.log(chalk.green(`🌐 Server running on http://localhost:${PORT}`));
    console.log(chalk.cyan(`📱 Pairing system ready`));
    console.log(chalk.green(`💾 Backup system: ${backupManager.initialized ? 'ACTIVE' : 'INACTIVE'}`));
    
    setTimeout(() => {
      autoRestoreSessions();
    }, 5000);
  });
}).catch(error => {
  server.listen(PORT, () => {
    console.log(chalk.green(`🌐 Server running on http://localhost:${PORT}`));
    console.log(chalk.yellow('⚠️  Backup system disabled'));
    
    setTimeout(() => {
      autoRestoreSessions();
    }, 5000);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🔄 Shutting down...'));
  sessionManager.destroy();
  
  server.close(() => {
    console.log(chalk.green('✅ Server closed'));
    process.exit(0);
  });
  
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

module.exports = { 
  broadcastToSession, 
  generateQRImage,
  app, 
  io,
  sessionManager 
};