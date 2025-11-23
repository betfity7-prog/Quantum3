// event-handlers.js - OPTIMIZED FOR 880+ USERS
const chalk = require('chalk');
const NodeCache = require('node-cache');

class EventHandlers {
    constructor(sock) {
        this.sock = sock;
        
        // Optimized caching for high traffic
        this.deletedMessages = new NodeCache({ stdTTL: 900, checkperiod: 300 }); // 15 minutes
        this.typingTimeouts = new Map();
        this.recordingTimeouts = new Map();
        this.featureCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1 hour
        
        // All features enabled by default for all users
        this.featureStates = {
            antidelete: true,
            autoview: true,
            autotyping: true,
            autorecording: true,
            antileft: false, // Disabled by default for large scale
            autolike: true
        };
        
        this.setupOptimizedHandlers();
        console.log(chalk.green('⚡ EventHandlers optimized for 880+ users'));
    }

    setupOptimizedHandlers() {
        this.setupAntiDelete();
        this.setupAutoViewStatus();
        this.setupAutoTyping();
        this.setupAutoRecording();
        this.setupAutoLikeStatus();
    }

    // ==================== OPTIMIZED ANTI-DELETE ====================
    setupAntiDelete() {
        this.sock.ev.on('messages.delete', async (deleteData) => {
            if (!this.featureStates.antidelete || !deleteData.keys?.length) return;
            
            console.log(chalk.yellow(`🔍 Anti-delete: ${deleteData.keys.length} messages`));
            
            for (const key of deleteData.keys) {
                try {
                    const deletedMessage = this.deletedMessages.get(key.id);
                    if (!deletedMessage) continue;

                    const content = this.extractMessageContent(deletedMessage);
                    const deleter = key.participant || 'Unknown';
                    
                    // Quick announcement
                    const announcement = `🚨 *Message Deleted*\\n👤 @${deleter.split('@')[0]}\\n💬 ${content.substring(0, 100)}...`;

                    await this.sock.sendMessage(key.remoteJid, { 
                        text: announcement,
                        mentions: [deleter]
                    });

                } catch (error) {
                    // Fail silently for performance
                }
            }
        });
    }

    // ==================== OPTIMIZED AUTO-TYPING ====================
    setupAutoTyping() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autotyping || m.type !== 'notify' || !m.messages.length) return;

            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message && msg.key.remoteJid) {
                    const jid = msg.key.remoteJid;
                    
                    // Clear existing timeout
                    if (this.typingTimeouts.has(jid)) {
                        clearTimeout(this.typingTimeouts.get(jid));
                    }

                    // Start typing
                    await this.sock.sendPresenceUpdate('composing', jid);
                    
                    // Set timeout to stop typing
                    const timeout = setTimeout(async () => {
                        await this.sock.sendPresenceUpdate('paused', jid);
                        this.typingTimeouts.delete(jid);
                    }, 10000); // Reduced to 10s for performance

                    this.typingTimeouts.set(jid, timeout);
                }
            }
        });
    }

    // ==================== OPTIMIZED AUTO-RECORDING ====================
    setupAutoRecording() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autorecording || m.type !== 'notify' || !m.messages.length) return;

            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message && msg.key.remoteJid) {
                    const jid = msg.key.remoteJid;
                    
                    // Clear existing timeout
                    if (this.recordingTimeouts.has(jid)) {
                        clearTimeout(this.recordingTimeouts.get(jid));
                    }

                    // Start recording
                    await this.sock.sendPresenceUpdate('recording', jid);
                    
                    // Set timeout to stop recording
                    const timeout = setTimeout(async () => {
                        await this.sock.sendPresenceUpdate('paused', jid);
                        this.recordingTimeouts.delete(jid);
                    }, 10000); // Reduced to 10s for performance

                    this.recordingTimeouts.set(jid, timeout);
                }
            }
        });
    }

    // ==================== OPTIMIZED AUTO-VIEW STATUS ====================
    setupAutoViewStatus() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoview || m.type !== 'notify' || !m.messages.length) return;
        
            for (const msg of m.messages) {
                if (msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
                    try {
                        await this.sock.readMessages([msg.key]);
                    } catch {
                        // Fail silently
                    }
                }
            }
        });
    }

    // ==================== OPTIMIZED AUTO-LIKE STATUS ====================
    setupAutoLikeStatus() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autolike || m.type !== 'notify' || !m.messages.length) return;
        
            for (const msg of m.messages) {
                if (msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
                    try {
                        await this.sock.sendMessage(msg.key.remoteJid, {
                            react: {
                                text: '❤️',
                                key: msg.key
                            }
                        });
                    } catch {
                        // Fail silently
                    }
                }
            }
        });
    }

    // ==================== UTILITY METHODS ====================
    extractMessageContent(msg) {
        try {
            const message = msg.message || msg;
            if (message.conversation) return message.conversation;
            if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
            if (message.imageMessage?.caption) return message.imageMessage.caption || '[Image]';
            if (message.videoMessage?.caption) return message.videoMessage.caption || '[Video]';
            return `[${Object.keys(message)[0]?.replace('Message', '')}]`;
        } catch {
            return '[Content]';
        }
    }

    storeRecentMessage(msg) {
        if (msg.key?.id) {
            this.deletedMessages.set(msg.key.id, msg);
        }
    }

    // Feature control
    toggleFeature(feature, enabled) {
        if (this.featureStates.hasOwnProperty(feature)) {
            this.featureStates[feature] = enabled;
            console.log(chalk.yellow(`🔧 ${feature} ${enabled ? 'ENABLED' : 'DISABLED'}`));
            return true;
        }
        return false;
    }

    getFeatureState(feature) {
        return this.featureStates[feature];
    }
}

module.exports = EventHandlers;