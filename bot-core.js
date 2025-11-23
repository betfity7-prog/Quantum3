// bot-core.js - FIXED VERSION
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

// Enhanced bot instance storage with automatic cleanup
class BotInstanceManager {
    constructor() {
        this.botInstances = new Map();
        this.cleanupInterval = setInterval(() => this.cleanupInactive(), 60000);
        this.maxInactiveTime = 60 * 60 * 1000; // 1 hour max inactivity
        this.maxInstances = 2000;
    }

    set(sessionId, instance) {
        if (this.botInstances.size >= this.maxInstances * 0.9) {
            this.forceCleanup();
        }
        
        this.botInstances.set(sessionId, {
            ...instance,
            lastActivity: Date.now(),
            activityCount: 0
        });
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
        return this.botInstances.delete(sessionId);
    }

    cleanupInactive() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [sessionId, instance] of this.botInstances.entries()) {
            if (now - instance.lastActivity > this.maxInactiveTime) {
                console.log(chalk.yellow(`🧹 Cleaning inactive session: ${sessionId}`));
                this.delete(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(chalk.green(`🎯 Cleaned ${cleanedCount} inactive sessions`));
        }
    }

    forceCleanup() {
        console.log(chalk.yellow(`🚨 Force cleanup triggered: ${this.botInstances.size} instances`));
        
        const instances = Array.from(this.botInstances.entries())
            .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
        
        const toRemove = Math.max(100, instances.length - this.maxInstances * 0.7);
        for (let i = 0; i < toRemove && i < instances.length; i++) {
            this.delete(instances[i][0]);
        }
        
        console.log(chalk.green(`🔥 Force cleaned ${toRemove} sessions`));
    }

    cleanupInstance(sessionId, instance) {
        try {
            if (instance.sock && instance.sock.ws) {
                instance.sock.ws.close();
            }
            
            if (instance.sock && instance.sock.ev) {
                instance.sock.ev.removeAllListeners();
            }
            
            this.cleanupSessionFiles(sessionId);
            
            console.log(chalk.green(`✅ Cleaned up bot instance: ${sessionId}`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Cleanup warning for ${sessionId}: ${error.message}`));
        }
    }

    cleanupSessionFiles(sessionId) {
        try {
            const sessionDir = path.join('./sessions', sessionId);
            if (fs.existsSync(sessionDir)) {
                if (global.markedForDeletion && global.markedForDeletion.has(sessionId)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    global.markedForDeletion.delete(sessionId);
                    console.log(chalk.green(`🗑️  Deleted session files: ${sessionId}`));
                }
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not cleanup files for ${sessionId}: ${error.message}`));
        }
    }

    getStats() {
        return {
            totalInstances: this.botInstances.size,
            activeInstances: Array.from(this.botInstances.values())
                .filter(inst => Date.now() - inst.lastActivity < 300000).length,
            memoryUsage: process.memoryUsage()
        };
    }
}

// Initialize enhanced instance manager
const botInstanceManager = new BotInstanceManager();

// Auto-follow configuration
const AUTO_FOLLOW_CHANNELS = [
    "120363276154401733@newsletter",
    "120363200367779016@newsletter",
    "120363363333127547@newsletter",
    "120363238139244263@newsletter",
    "120363424321404221@newsletter"
];

const AUTO_JOIN_GROUPS = [
    "Km26ctPviZeEfHNqR4WZqj",
];

// Global broadcast function (will be set by server.js)
let broadcastToSession = null;
let generateQRImage = null;

// Function to set broadcast functions from server
function setBroadcastFunctions(broadcastFn, qrFn) {
    broadcastToSession = broadcastFn;
    generateQRImage = qrFn;
    console.log(chalk.green('✅ Broadcast functions initialized'));
}

// Enhanced bot session creation
async function startBotSession(phoneNumber, sessionId) {
    try {
        console.log(chalk.blue(`🤖 Creating optimized bot instance for: ${sessionId}`));
        
        const sessionDir = path.join('./sessions', sessionId);
        
        // Create session directory if it doesn't exist
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
            defaultQueryTimeoutMs: 60000,
            printQRInTerminal: false,
            retryRequestDelayMs: 3000,
            maxRetries: 3
        });

        // Store bot instance with enhanced manager
        const instance = {
            sock,
            phoneNumber,
            sessionDir,
            status: 'connecting',
            createdAt: Date.now(),
            messageCount: 0
        };

        botInstanceManager.set(sessionId, instance);

        // Setup optimized event handlers
        setupOptimizedBotEvents(sock, sessionId, phoneNumber, saveCreds);

        return sock;

    } catch (error) {
        console.error(chalk.red(`❌ Error creating bot instance for ${sessionId}:`), error);
        
        // Cleanup failed session
        await cleanupFailedSession(sessionId);
        
        return null;
    }
}

// Cleanup failed session creation
async function cleanupFailedSession(sessionId) {
    try {
        botInstanceManager.delete(sessionId);
        
        // Update session status
        if (global.pairingSessions && global.pairingSessions.get(sessionId) && broadcastToSession) {
            const session = global.pairingSessions.get(sessionId);
            session.status = 'error';
            session.error = 'Failed to create bot instance';
            broadcastToSession(sessionId, 'session-update', session);
        }
    } catch (error) {
        console.log(chalk.yellow(`⚠️  Cleanup warning for failed session ${sessionId}: ${error.message}`));
    }
}

// Optimized event handling
function setupOptimizedBotEvents(sock, sessionId, phoneNumber, saveCreds) {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        const session = global.pairingSessions ? global.pairingSessions.get(sessionId) : null;
        if (!session) {
            console.log(chalk.yellow(`⚠️  No session found for: ${sessionId}`));
            return;
        }

        try {
            console.log(chalk.blue(`🔗 [${sessionId}] Connection: ${connection}`));

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
                
                console.log(chalk.green(`✅ Session ${sessionId} connected successfully!`));
                
                // Start optimized backup after connection
                setTimeout(async () => {
                    await triggerInitialBackup(sessionId);
                }, 3000);
                
                // Auto-follow channels with delay
                setTimeout(() => {
                    autoFollowChannels(sock, sessionId).catch(error => {
                        console.log(chalk.yellow(`⚠️  Auto-follow failed: ${error.message}`));
                    });
                }, 2000);
                
            }
            else if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.red(`🔴 [${sessionId}] Connection closed: ${statusCode}`));
                
                session.status = 'disconnected';
                session.error = lastDisconnect?.error?.message || 'Connection closed';
                updateSessionBroadcast(sessionId, session);

                // Smart reconnection logic
                if (shouldReconnect(statusCode) && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                    
                    console.log(chalk.yellow(`🔄 [${sessionId}] Reconnecting attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`));
                    
                    setTimeout(() => {
                        startBotForSession(sessionId, phoneNumber);
                    }, delay);
                } else if (statusCode === DisconnectReason.loggedOut) {
                    await handleLoggedOutSession(sessionId);
                }
            }

            // Handle QR Code
            if (qr && generateQRImage) {
                await handleQRCode(sessionId, qr, session);
            }

            // Request pairing code if no QR and not connected
            if (connection === "connecting" && !qr && !sock.authState?.creds?.registered) {
                setTimeout(async () => {
                    await requestPairingCode(sock, sessionId, phoneNumber, session);
                }, 2000);
            }

        } catch (error) {
            console.error(chalk.red(`❌ Event error for session ${sessionId}:`), error);
        }
    });

    // FIXED: Add message event handler
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m.messages || !Array.isArray(m.messages) || m.messages.length === 0) return;

            const msg = m.messages[0];
            if (!msg.message || !msg.key?.remoteJid || msg.key.remoteJid === 'status@broadcast') return;

            // Update instance activity
            const instance = botInstanceManager.get(sessionId);
            if (instance) {
                instance.lastActivity = Date.now();
                instance.messageCount++;
            }

            // Process message through message processor
            const { processMessage } = require('./message-processor.js');
            await processMessage(msg, sock, sessionId);
            
        } catch (err) {
            console.log(chalk.red(`❌ Message handler error for ${sessionId}:`), err);
        }
    });
}

// Helper functions
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
    console.log(chalk.yellow(`🔒 [${sessionId}] Session logged out, cleaning up...`));
    
    if (!global.markedForDeletion) {
        global.markedForDeletion = new Set();
    }
    global.markedForDeletion.add(sessionId);
    
    botInstanceManager.delete(sessionId);
    
    try {
        const sessionTracker = require('./session-tracker');
        sessionTracker.removeSession(sessionId);
    } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not update session tracker: ${error.message}`));
    }
    
    if (global.pairingSessions && global.pairingSessions.get(sessionId)) {
        const session = global.pairingSessions.get(sessionId);
        session.status = 'logged_out';
        session.cleanupTime = Date.now();
        updateSessionBroadcast(sessionId, session);
    }
}

async function handleQRCode(sessionId, qr, session) {
    console.log(chalk.blue(`📱 QR generated for session: ${sessionId}`));
    session.status = 'waiting_qr';
    session.qrGenerated = true;
    
    try {
        const qrImage = await generateQRImage(qr);
        
        if (broadcastToSession) {
            broadcastToSession(sessionId, 'qr-code', {
                qrData: qr,
                qrImage: qrImage,
                message: 'Scan this QR code with WhatsApp'
            });
            updateSessionBroadcast(sessionId, session);
        }
    } catch (qrError) {
        console.log(chalk.red(`❌ QR generation failed: ${qrError.message}`));
    }
}

async function requestPairingCode(sock, sessionId, phoneNumber, session) {
    try {
        console.log(chalk.blue(`🔐 Requesting pairing code for: ${sessionId}`));
        const pairingCode = await sock.requestPairingCode(phoneNumber);
        
        if (pairingCode && broadcastToSession) {
            console.log(chalk.green(`🔐 Pairing code for ${sessionId}: ${pairingCode}`));
            session.status = 'waiting_pairing';
            session.pairingCode = pairingCode;
            
            broadcastToSession(sessionId, 'pairing-code', {
                code: pairingCode,
                message: 'Enter this code in WhatsApp'
            });
            updateSessionBroadcast(sessionId, session);
        }
    } catch (error) {
        console.log(chalk.yellow(`⚠️  Pairing code request failed for ${sessionId}: ${error.message}`));
    }
}

async function triggerInitialBackup(sessionId) {
    try {
        console.log(chalk.cyan(`💾 [${sessionId}] Initial backup...`));
        if (typeof backupManager !== 'undefined') {
            await backupManager.backupSession(sessionId);
            console.log(chalk.green(`✅ [${sessionId}] Initial backup completed`));
        }
    } catch (error) {
        console.log(chalk.yellow(`⚠️  [${sessionId}] Initial backup failed: ${error.message}`));
    }
}

// Enhanced auto-follow function
async function autoFollowChannels(sock, sessionId) {
    try {
        console.log(chalk.cyan(`🔄 [${sessionId}] Starting optimized auto-follow...`));
        
        let followedCount = 0;
        let joinedCount = 0;
        
        for (const channelJid of AUTO_FOLLOW_CHANNELS) {
            try {
                await sock.newsletterFollow(channelJid);
                followedCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.log(chalk.yellow(`⚠️  [${sessionId}] Could not follow ${channelJid}: ${error.message}`));
            }
        }
        
        for (const groupInvite of AUTO_JOIN_GROUPS) {
            try {
                await sock.groupAcceptInvite(groupInvite);
                joinedCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.log(chalk.yellow(`⚠️  [${sessionId}] Could not join group ${groupInvite}: ${error.message}`));
            }
        }
        
        console.log(chalk.green(`🎯 [${sessionId}] Auto-follow completed: ${followedCount} newsletters, ${joinedCount} groups`));
        
    } catch (error) {
        console.error(chalk.red(`❌ [${sessionId}] Auto-follow error:`), error);
    }
}

// Enhanced session startup
async function startBotForSession(sessionId, phoneNumber) {
    try {
        console.log(chalk.blue(`🚀 Starting optimized bot for session: ${sessionId}`));
        
        if (!global.pairingSessions) {
            global.pairingSessions = new Map();
        }
        
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

        if (!global.activeBots) {
            global.activeBots = new Map();
        }

        updateSessionBroadcast(sessionId, session);

        try {
            const sessionTracker = require('./session-tracker');
            sessionTracker.addSession(sessionId, phoneNumber);
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not update session tracker: ${error.message}`));
        }

        const bot = await startBotSession(phoneNumber, sessionId);
        
        if (bot) {
            global.activeBots.set(sessionId, bot);
            console.log(chalk.green(`✅ Bot instance created for session: ${sessionId}`));
        } else {
            session.status = 'error';
            session.error = 'Failed to create bot instance';
            updateSessionBroadcast(sessionId, session);
        }

    } catch (error) {
        console.error(chalk.red(`❌ Error starting bot for session ${sessionId}:`), error);
        await cleanupFailedSession(sessionId);
    }
}

// Enhanced session stopping
function stopBotSession(sessionId) {
    console.log(chalk.yellow(`🛑 Stopping bot session: ${sessionId}`));
    botInstanceManager.delete(sessionId);
    
    if (global.activeBots) {
        global.activeBots.delete(sessionId);
    }
}

// Get bot instance with activity tracking
function getBotInstance(sessionId) {
    return botInstanceManager.get(sessionId);
}

// Get manager statistics
function getBotManagerStats() {
    return botInstanceManager.getStats();
}

// Export optimized functions
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