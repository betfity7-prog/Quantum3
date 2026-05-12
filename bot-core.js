const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');

// 🚀 HIGH-PERFORMANCE INSTANCE MANAGER
class BotInstanceManager {
    constructor() {
        this.botInstances = new Map();
        this.connectionCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
        this.cleanupInterval = null;
        this.maxInactiveTime = 30 * 60 * 1000;
        this.maxInstances = 2000;
        this.stats = {
            totalCreated: 0,
            totalDestroyed: 0,
            activeConnections: 0,
            memoryUsage: []
        };
        this.isShuttingDown = false;
        
        // Start cleanup interval
        this.startCleanupInterval();
    }
    
    startCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.cleanupInterval = setInterval(() => this.cleanupInactive(), 30000);
    }
    
    stopCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
    
    shutdown() {
        if (this.isShuttingDown) return;
        console.log(chalk.yellow('🛑 Shutting down BotInstanceManager...'));
        
        this.isShuttingDown = true;
        this.stopCleanupInterval();
        
        // Cleanup all instances
        for (const [sessionId, instance] of this.botInstances.entries()) {
            this.cleanupInstance(sessionId, instance);
        }
        
        this.botInstances.clear();
        
        if (this.connectionCache) {
            this.connectionCache.close();
        }
        
        console.log(chalk.green('✅ BotInstanceManager shutdown complete'));
    }

    set(sessionId, instance) {
        if (this.isShuttingDown) {
            console.log(chalk.yellow(`⚠️ Cannot add instance during shutdown: ${sessionId}`));
            return;
        }
        
        if (this.botInstances.size >= this.maxInstances * 0.9) {
            this.forceCleanup();
        }
        
        this.botInstances.set(sessionId, {
            ...instance,
            lastActivity: Date.now(),
            activityCount: 0,
            messageCount: 0,
            status: 'active',
            eventListeners: new Set(),
            timeouts: new Set(),
            intervals: new Set()
        });
        
        this.stats.totalCreated++;
        this.updateStats();
    }

    get(sessionId) {
        const instance = this.botInstances.get(sessionId);
        if (instance) {
            instance.lastActivity = Date.now();
            instance.activityCount++;
        }
        return instance;
    }

    delete(sessionId) {
        const instance = this.botInstances.get(sessionId);
        if (instance) {
            this.cleanupInstance(sessionId, instance);
        }
        const deleted = this.botInstances.delete(sessionId);
        if (deleted) this.stats.totalDestroyed++;
        return deleted;
    }

    cleanupInactive() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [sessionId, instance] of this.botInstances.entries()) {
            if (now - instance.lastActivity > this.maxInactiveTime && instance.status !== 'connected') {
                console.log(chalk.yellow(`🧹 Cleaning inactive: ${sessionId}`));
                this.delete(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(chalk.green(`🎯 Cleaned ${cleanedCount} inactive sessions`));
        }
        
        this.updateStats();
    }

    forceCleanup() {
        console.log(chalk.yellow(`🚨 Force cleanup: ${this.botInstances.size} instances`));
        
        const instances = Array.from(this.botInstances.entries())
            .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
        
        const toRemove = Math.max(50, instances.length - this.maxInstances * 0.7);
        for (let i = 0; i < toRemove && i < instances.length; i++) {
            this.delete(instances[i][0]);
        }
        
        console.log(chalk.green(`🔥 Force cleaned ${toRemove} sessions`));
    }

    cleanupInstance(sessionId, instance) {
        try {
            // Clear all timeouts
            if (instance.timeouts) {
                instance.timeouts.forEach(timeoutId => {
                    try {
                        clearTimeout(timeoutId);
                    } catch (e) {}
                });
                instance.timeouts.clear();
            }
            
            // Clear all intervals
            if (instance.intervals) {
                instance.intervals.forEach(intervalId => {
                    try {
                        clearInterval(intervalId);
                    } catch (e) {}
                });
                instance.intervals.clear();
            }
            
            // Close socket connection
            if (instance.sock) {
                try {
                    // Close WebSocket first
                    if (instance.sock.ws && typeof instance.sock.ws.close === 'function') {
                        instance.sock.ws.close();
                    }
                    
                    // Remove event listeners
                    if (instance.sock.ev && typeof instance.sock.ev.removeAllListeners === 'function') {
                        instance.sock.ev.removeAllListeners();
                    }
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Socket cleanup warning: ${e.message}`));
                }
            }
            
            this.cleanupSessionFiles(sessionId);
            console.log(chalk.green(`✅ Cleaned instance: ${sessionId}`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️ Cleanup warning: ${error.message}`));
        }
    }

    cleanupSessionFiles(sessionId) {
        try {
            const sessionDir = path.join('./sessions', sessionId);
            if (fs.existsSync(sessionDir)) {
                if (global.markedForDeletion && global.markedForDeletion.has(sessionId)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    global.markedForDeletion.delete(sessionId);
                }
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️ File cleanup failed: ${error.message}`));
        }
    }

    updateStats() {
        this.stats.activeConnections = Array.from(this.botInstances.values())
            .filter(inst => inst.status === 'connected').length;
            
        this.stats.memoryUsage.push(process.memoryUsage().heapUsed);
        if (this.stats.memoryUsage.length > 100) this.stats.memoryUsage.shift();
    }

    getStats() {
        return {
            totalInstances: this.botInstances.size,
            activeInstances: this.stats.activeConnections,
            ...this.stats,
            memoryUsage: process.memoryUsage()
        };
    }
}

// 🚀 OPTIMIZED BOT CORE WITH EVENT SYSTEM
const botInstanceManager = new BotInstanceManager();
const AUTO_FOLLOW_CHANNELS = [
    "120363276154401733@newsletter",
    "120363200367779016@newsletter",
    "120363363333127547@newsletter",
    "120363238139244263@newsletter",
    "120363424321404221@newsletter"
];

let broadcastToSession = null;
let generateQRImage = null;

function setBroadcastFunctions(broadcastFn, qrFn) {
    broadcastToSession = broadcastFn;
    generateQRImage = qrFn;
}

async function startBotSession(phoneNumber, sessionId) {
    try {
        console.log(chalk.blue(`🚀 Creating bot: ${sessionId}`));
        
        const sessionDir = path.join('./sessions', sessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            browser: Browsers.ubuntu("Chrome"),
            generateHighQualityLinkPreview: true,
            auth: state,
            logger: pino({ level: "silent" }),
            markOnlineOnConnect: true,
            syncFullHistory: false,
            defaultQueryTimeoutMs: 30000,
            printQRInTerminal: false,
            retryRequestDelayMs: 2000,
            maxRetries: 2
        });

        const instance = {
            sock,
            phoneNumber,
            sessionDir,
            status: 'connecting',
            createdAt: Date.now(),
            messageCount: 0
        };

        botInstanceManager.set(sessionId, instance);
        
        // 🎯 INITIALIZE EVENT SYSTEM FOR THIS BOT INSTANCE
        try {
            const { initializeEventSystem } = require('./message-processor.js');
            initializeEventSystem(sock);
            console.log(chalk.green(`🎮 Event system initialized for: ${sessionId}`));
        } catch (error) {
            console.error(chalk.red(`❌ Event system init failed for ${sessionId}:`), error);
        }
        
        setupOptimizedBotEvents(sock, sessionId, phoneNumber, saveCreds);

        return sock;

    } catch (error) {
        console.error(chalk.red(`❌ Bot creation failed: ${sessionId}`), error);
        await cleanupFailedSession(sessionId);
        return null;
    }
}

async function cleanupFailedSession(sessionId) {
    try {
        botInstanceManager.delete(sessionId);
        
        if (global.pairingSessions && global.pairingSessions.get(sessionId) && broadcastToSession) {
            const session = global.pairingSessions.get(sessionId);
            session.status = 'error';
            session.error = 'Failed to create bot instance';
            broadcastToSession(sessionId, 'session-update', session);
        }
    } catch (error) {
        console.log(chalk.yellow(`⚠️ Cleanup warning: ${error.message}`));
    }
}

function setupOptimizedBotEvents(sock, sessionId, phoneNumber, saveCreds) {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    let reconnectTimeout = null;
    
    const instance = botInstanceManager.get(sessionId);
    if (!instance) {
        console.log(chalk.yellow(`⚠️ No instance found for: ${sessionId}`));
        return;
    }

    // Track event listeners for cleanup
    const credsUpdateHandler = saveCreds;
    sock.ev.on("creds.update", credsUpdateHandler);
    if (instance.eventListeners) {
        instance.eventListeners.add({ event: "creds.update", handler: credsUpdateHandler });
    }

    const connectionUpdateHandler = async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        const session = global.pairingSessions ? global.pairingSessions.get(sessionId) : null;
        if (!session) return;

        try {
            if (connection === "connecting") {
                session.status = 'connecting';
                updateSessionBroadcast(sessionId, session);
            } 
            else if (connection === "open") {
                session.status = 'connected';
                session.connectedAt = Date.now();
                session.userInfo = sock.user?.name || 'Connected';
                reconnectAttempts = 0;
                
                updateSessionBroadcast(sessionId, session);
                console.log(chalk.green(`✅ Connected: ${sessionId}`));
                
                // 🚀 OPTIMIZED AUTO-FOLLOW
                setTimeout(() => {
                    autoFollowChannels(sock, sessionId).catch(console.error);
                }, 1000);
            }
            else if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.red(`🔴 Closed: ${sessionId} - ${statusCode}`));
                
                session.status = 'disconnected';
                session.error = lastDisconnect?.error?.message || 'Connection closed';
                updateSessionBroadcast(sessionId, session);

                if (shouldReconnect(statusCode) && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
                    
                    console.log(chalk.yellow(`🔄 Reconnecting: ${sessionId} (${reconnectAttempts}/${maxReconnectAttempts})`));
                    
                    // Clear previous timeout if exists
                    if (reconnectTimeout) {
                        clearTimeout(reconnectTimeout);
                    }
                    
                    reconnectTimeout = setTimeout(() => {
                        startBotForSession(sessionId, phoneNumber);
                    }, delay);
                    
                    // Track timeout for cleanup
                    if (instance && instance.timeouts) {
                        instance.timeouts.add(reconnectTimeout);
                    }
                } else if (statusCode === DisconnectReason.loggedOut) {
                    await handleLoggedOutSession(sessionId);
                }
            }

            if (qr && generateQRImage) {
                await handleQRCode(sessionId, qr, session);
            }

            if (connection === "connecting" && !qr && !sock.authState?.creds?.registered) {
                const pairingTimeout = setTimeout(async () => {
                    await requestPairingCode(sock, sessionId, phoneNumber, session);
                }, 1500);
                
                // Track timeout for cleanup
                if (instance && instance.timeouts) {
                    instance.timeouts.add(pairingTimeout);
                }
            }

        } catch (error) {
            console.error(chalk.red(`❌ Event error: ${sessionId}`), error);
        }
    };
    
    sock.ev.on("connection.update", connectionUpdateHandler);
    if (instance.eventListeners) {
        instance.eventListeners.add({ event: "connection.update", handler: connectionUpdateHandler });
    }

    // 🚀 OPTIMIZED MESSAGE HANDLING WITH EVENT SYSTEM
    const messagesUpsertHandler = async (m) => {
        try {
            if (!m || !m.messages || !Array.isArray(m.messages) || m.messages.length === 0) return;

            const msg = m.messages[0];
            if (!msg || !msg.message || !msg.key?.remoteJid || msg.key.remoteJid === 'status@broadcast') return;

            const currentInstance = botInstanceManager.get(sessionId);
            if (currentInstance) {
                currentInstance.lastActivity = Date.now();
                currentInstance.messageCount++;
            }

            const { processMessage } = require('./message-processor.js');
            await processMessage(msg, sock, sessionId);
            
        } catch (err) {
            console.log(chalk.red(`❌ Message error: ${sessionId}`), err);
        }
    };
    
    sock.ev.on("messages.upsert", messagesUpsertHandler);
    if (instance.eventListeners) {
        instance.eventListeners.add({ event: "messages.upsert", handler: messagesUpsertHandler });
    }
}

function updateSessionBroadcast(sessionId, session) {
    if (broadcastToSession) {
        broadcastToSession(sessionId, 'session-update', session);
    }
}

function shouldReconnect(statusCode) {
    const nonRetryableCodes = [
        DisconnectReason.loggedOut,
        DisconnectReason.badSession,
        DisconnectReason.forbidden
    ];
    return !nonRetryableCodes.includes(statusCode);
}

async function handleLoggedOutSession(sessionId) {
    console.log(chalk.yellow(`🔒 Logged out: ${sessionId}`));
    
    if (!global.markedForDeletion) global.markedForDeletion = new Set();
    global.markedForDeletion.add(sessionId);
    
    botInstanceManager.delete(sessionId);
    
    try {
        const sessionTracker = require('./session-tracker');
        sessionTracker.removeSession(sessionId);
    } catch (error) {
        console.log(chalk.yellow(`⚠️ Tracker update failed: ${error.message}`));
    }
    
    if (global.pairingSessions && global.pairingSessions.get(sessionId)) {
        const session = global.pairingSessions.get(sessionId);
        session.status = 'logged_out';
        session.cleanupTime = Date.now();
        updateSessionBroadcast(sessionId, session);
    }
}

async function handleQRCode(sessionId, qr, session) {
    console.log(chalk.blue(`📱 QR: ${sessionId}`));
    session.status = 'waiting_qr';
    session.qrGenerated = true;
    
    try {
        const qrImage = await generateQRImage(qr);
        
        if (broadcastToSession) {
            broadcastToSession(sessionId, 'qr-code', {
                qrData: qr,
                qrImage: qrImage,
                message: 'Scan QR with WhatsApp'
            });
            updateSessionBroadcast(sessionId, session);
        }
    } catch (qrError) {
        console.log(chalk.red(`❌ QR failed: ${qrError.message}`));
    }
}

async function requestPairingCode(sock, sessionId, phoneNumber, session) {
    try {
        console.log(chalk.blue(`🔐 Pairing: ${sessionId}`));
        const pairingCode = await sock.requestPairingCode(phoneNumber);
        
        if (pairingCode && broadcastToSession) {
            console.log(chalk.green(`🔐 Code: ${sessionId} - ${pairingCode}`));
            session.status = 'waiting_pairing';
            session.pairingCode = pairingCode;
            
            broadcastToSession(sessionId, 'pairing-code', {
                code: pairingCode,
                message: 'Enter code in WhatsApp'
            });
            updateSessionBroadcast(sessionId, session);
        }
    } catch (error) {
        console.log(chalk.yellow(`⚠️ Pairing failed: ${error.message}`));
    }
}

async function autoFollowChannels(sock, sessionId) {
    try {
        if (!sock || !sock.newsletterFollow) {
            console.log(chalk.yellow(`⚠️ Socket not ready for auto-follow: ${sessionId}`));
            return;
        }
        
        console.log(chalk.cyan(`🔄 Auto-follow: ${sessionId}`));
        
        let followedCount = 0;
        
        for (const channelJid of AUTO_FOLLOW_CHANNELS) {
            try {
                if (typeof sock.newsletterFollow === 'function') {
                    await sock.newsletterFollow(channelJid);
                    followedCount++;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                console.log(chalk.yellow(`⚠️ Follow failed: ${channelJid} - ${error.message}`));
            }
        }
        
        console.log(chalk.green(`🎯 Auto-follow: ${followedCount}/${AUTO_FOLLOW_CHANNELS.length} channels`));
        
    } catch (error) {
        console.error(chalk.red(`❌ Auto-follow error: ${sessionId}`), error);
    }
}

async function startBotForSession(sessionId, phoneNumber) {
    try {
        console.log(chalk.blue(`🚀 Starting: ${sessionId}`));
        
        if (!global.pairingSessions) global.pairingSessions = new Map();
        
        let session = global.pairingSessions.get(sessionId);
        if (!session) {
            session = {
                id: sessionId,
                phoneNumber: phoneNumber,
                status: 'starting',
                createdAt: Date.now(),
                socketId: null
            };
            global.pairingSessions.set(sessionId, session);
        } else {
            session.status = 'starting';
            session.phoneNumber = phoneNumber;
        }

        if (!global.activeBots) global.activeBots = new Map();

        updateSessionBroadcast(sessionId, session);

        try {
            const sessionTracker = require('./session-tracker');
            sessionTracker.addSession(sessionId, phoneNumber);
        } catch (error) {
            console.log(chalk.yellow(`⚠️ Tracker failed: ${error.message}`));
        }

        const bot = await startBotSession(phoneNumber, sessionId);
        
        if (bot) {
            global.activeBots.set(sessionId, bot);
            console.log(chalk.green(`✅ Bot created: ${sessionId}`));
        } else {
            session.status = 'error';
            session.error = 'Failed to create bot instance';
            updateSessionBroadcast(sessionId, session);
        }

    } catch (error) {
        console.error(chalk.red(`❌ Start failed: ${sessionId}`), error);
        await cleanupFailedSession(sessionId);
    }
}

function stopBotSession(sessionId) {
    console.log(chalk.yellow(`🛑 Stopping: ${sessionId}`));
    
    const instance = botInstanceManager.get(sessionId);
    if (instance) {
        // Remove event listeners before deleting
        if (instance.sock && instance.sock.ev && instance.eventListeners) {
            instance.eventListeners.forEach(({ event, handler }) => {
                try {
                    if (instance.sock.ev && typeof instance.sock.ev.off === 'function') {
                        instance.sock.ev.off(event, handler);
                    }
                } catch (e) {
                    console.log(chalk.yellow(`⚠️ Event cleanup warning: ${e.message}`));
                }
            });
        }
    }
    
    botInstanceManager.delete(sessionId);
    
    if (global.activeBots) {
        global.activeBots.delete(sessionId);
    }
}

function getBotInstance(sessionId) {
    return botInstanceManager.get(sessionId);
}

function getBotManagerStats() {
    return botInstanceManager.getStats();
}

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Received SIGINT, shutting down gracefully...'));
    botInstanceManager.shutdown();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Received SIGTERM, shutting down gracefully...'));
    botInstanceManager.shutdown();
    process.exit(0);
});

module.exports = {
    startBotSession,
    startBotForSession,
    getBotInstance,
    stopBotSession,
    botInstanceManager,
    setBroadcastFunctions,
    autoFollowChannels,
    getBotManagerStats
};
