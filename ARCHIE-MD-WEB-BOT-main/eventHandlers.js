// eventHandlers.js - COMPLETE WORKING ANTIDELETE
const chalk = require('chalk');
const NodeCache = require('node-cache');

class OptimizedEventHandlers {
    constructor(sock) {
        this.sock = sock;
        
        // 🚀 ENHANCED CACHING FOR ANTIDELETE
        this.deletedMessages = new NodeCache({ 
            stdTTL: 600,        // 10 minutes
            checkperiod: 120,
            maxKeys: 10000,     // Increased for more messages
            useClones: false
        });
        
        this.typingSessions = new Map();
        this.recordingSessions = new Map();
        
        // 🎯 DEFAULT FEATURE STATES
        this.featureStates = {
            antidelete: true,
            autoview: true,
            autotyping: true,
            autorecording: true,
            antileft: false,
            autolike: true,
            autoreact: true
        };
        
        // 🚀 PERFORMANCE OPTIMIZATIONS
        this.stats = {
            antideleteTriggers: 0,
            autoviewTriggers: 0,
            autotypingTriggers: 0,
            autorecordingTriggers: 0,
            autoreactTriggers: 0,
            messagesStored: 0,
            errors: 0,
            lastReset: Date.now()
        };
        
        this.rateLimits = new Map();
        this.messageProcessors = new Map();
        
        console.log(chalk.green('🚀 Optimized EventHandlers initialized for 880+ users'));
    }

    // 🎯 SETUP ALL HANDLERS
    setupAllHandlers() {
        this.setupAntiDelete();
        this.setupAutoViewStatus();
        this.setupAutoTyping();
        this.setupAutoRecording();
        this.setupAutoLikeStatus();
        this.setupStatusReact();
        
        console.log(chalk.cyan('✅ All event handlers activated'));
    }

    // 🛡️ ENHANCED ANTIDELETE WITH MULTIPLE DETECTION METHODS
    setupAntiDelete() {
        console.log(chalk.yellow('🛡️ Setting up anti-delete listeners...'));
        
        // METHOD 1: messages.delete event (Primary)
        this.sock.ev.on('messages.delete', async (deleteData) => {
            if (!this.featureStates.antidelete) return;
            
            console.log(chalk.yellow(`🔍 Anti-delete triggered: ${deleteData.keys?.length || 0} messages`));
            
            if (!deleteData.keys?.length) return;
            
            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('antidelete') || 0;
            if (now - lastTrigger < 1000) return;
            this.rateLimits.set('antidelete', now);
            
            this.stats.antideleteTriggers++;
            
            // 🚀 PROCESS DELETED MESSAGES
            for (const key of deleteData.keys.slice(0, 5)) {
                await this.handleDeletedMessage(key);
            }
        });

        // METHOD 2: messages.update for revocations (Backup)
        this.sock.ev.on('messages.update', async (updates) => {
            if (!this.featureStates.antidelete || !updates.length) return;

            for (const update of updates) {
                // Check for message revocation (deletion)
                if (update.update && (
                    update.update.messageStubType === 67 || // Message deleted for everyone
                    update.update.messageStubType === 0     // Message revoked
                )) {
                    console.log(chalk.yellow(`🔍 Message revocation detected: ${update.key.id}`));
                    await this.handleDeletedMessage(update.key);
                }
            }
        });

        // METHOD 3: Protocol message handling (Alternative)
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.antidelete || m.type !== 'notify') return;

            for (const msg of m.messages) {
                // Check for protocol messages indicating deletion
                if (msg.message?.protocolMessage?.type === 5) { // REVOKE
                    const key = msg.message.protocolMessage.key;
                    console.log(chalk.yellow(`🔍 Protocol revoke detected: ${key.id}`));
                    await this.handleDeletedMessage(key);
                }
            }
        });

        console.log(chalk.green('✅ Anti-delete listeners activated'));
    }

    // 🎯 HANDLE DELETED MESSAGE
    async handleDeletedMessage(key) {
        try {
            const messageId = key.id;
            const deletedMessage = this.deletedMessages.get(messageId);
            
            if (!deletedMessage) {
                console.log(chalk.yellow(`⚠️ No stored message found for: ${messageId}`));
                return;
            }

            const content = this.extractMessageContent(deletedMessage);
            const deleter = key.participant || 'Unknown';
            const chatJid = key.remoteJid;
            const sender = deletedMessage.key?.participant || deletedMessage.key?.remoteJid || 'Unknown';
            
            console.log(chalk.green(`🎯 Retrieved deleted message: ${messageId.substring(0, 8)}...`));
            
            // 🚀 CREATE ANNOUNCEMENT
            const announcement = this.createDeleteAnnouncement(content, deleter, sender);
            
            // 🚀 SEND TO SAME CHAT
            const success = await this.safeSendMessage(chatJid, {
                text: announcement,
                mentions: [deleter, sender].filter(Boolean)
            });

            if (success) {
                console.log(chalk.green(`✅ Anti-delete announced in: ${chatJid}`));
                
                // 🚀 ALSO SEND TO BOT OWNER IF DIFFERENT CHAT
                const botNumber = this.sock.user?.id;
                if (botNumber && chatJid !== botNumber) {
                    await this.safeSendMessage(botNumber, {
                        text: `🚨 *Message Deleted Report*\n\n💬 ${content.substring(0, 100)}...\n👤 From: ${sender}\n🗑️ Deleted by: ${deleter}\n💬 Chat: ${chatJid}`
                    });
                }
            }

            // Remove from cache after processing
            this.deletedMessages.del(messageId);

        } catch (error) {
            this.stats.errors++;
            console.log(chalk.red(`❌ Anti-delete error: ${error.message}`));
        }
    }

    // 🎯 CREATE DELETE ANNOUNCEMENT
    createDeleteAnnouncement(content, deleter, sender) {
        const deleterName = deleter.split('@')[0];
        const senderName = sender.split('@')[0];
        
        let announcement = `🚨 *Message Deleted*\n\n`;
        
        if (deleter !== sender && deleter !== 'Unknown') {
            announcement += `🗑️ *Deleted by:* @${deleterName}\n`;
        }
        
        announcement += `👤 *From:* @${senderName}\n\n`;
        announcement += `💬 *Message:* ${content.substring(0, 200)}`;
        
        if (content.length > 200) {
            announcement += '...';
        }
        
        return announcement;
    }

    // 👀 AUTO-VIEW STATUS (Optimized)
    setupAutoViewStatus() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoview || m.type !== 'notify' || !m.messages.length) return;

            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autoview') || 0;
            if (now - lastTrigger < 2000) return;
            this.rateLimits.set('autoview', now);
            
            this.stats.autoviewTriggers++;
            
            // 🚀 PROCESS STATUS UPDATES
            const statusMessages = m.messages.filter(msg => 
                msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe
            ).slice(0, 3);

            for (const msg of statusMessages) {
                try {
                    await this.sock.readMessages([msg.key]);
                    console.log(chalk.blue(`👀 Auto-viewed status from: ${msg.pushName || 'Unknown'}`));
                } catch (error) {
                    if (!error.message.includes('rate-overlimit')) {
                        console.log(chalk.yellow(`⚠️ Auto-view error: ${error.message}`));
                    }
                }
            }
        });
    }

    // ⌨️ AUTO-TYPING (Debounced for performance)
    setupAutoTyping() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autotyping || m.type !== 'notify' || !m.messages.length) return;

            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autotyping') || 0;
            if (now - lastTrigger < 1500) return;
            this.rateLimits.set('autotyping', now);
            
            this.stats.autotypingTriggers++;
            
            // 🚀 DEBOUNCED TYPING
            const typingChats = new Set();
            
            for (const msg of m.messages.slice(0, 5)) {
                if (!msg.key.fromMe && msg.message && msg.key.remoteJid && !msg.key.remoteJid.endsWith('@broadcast')) {
                    typingChats.add(msg.key.remoteJid);
                }
            }

            for (const jid of Array.from(typingChats).slice(0, 3)) {
                if (this.typingSessions.has(jid)) continue;
                
                try {
                    await this.sock.sendPresenceUpdate('composing', jid);
                    
                    const timeout = setTimeout(async () => {
                        await this.safePresenceUpdate('paused', jid);
                        this.typingSessions.delete(jid);
                    }, 8000);

                    this.typingSessions.set(jid, timeout);
                } catch (error) {
                    // Silent fail
                }
            }
        });
    }

    // ⏺️ AUTO-RECORDING (Debounced for performance)
    setupAutoRecording() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autorecording || m.type !== 'notify' || !m.messages.length) return;

            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autorecording') || 0;
            if (now - lastTrigger < 1500) return;
            this.rateLimits.set('autorecording', now);
            
            this.stats.autorecordingTriggers++;
            
            // 🚀 DEBOUNCED RECORDING
            const recordingChats = new Set();
            
            for (const msg of m.messages.slice(0, 5)) {
                if (!msg.key.fromMe && msg.message && msg.key.remoteJid && !msg.key.remoteJid.endsWith('@broadcast')) {
                    recordingChats.add(msg.key.remoteJid);
                }
            }

            for (const jid of Array.from(recordingChats).slice(0, 2)) {
                if (this.recordingSessions.has(jid)) continue;
                
                try {
                    await this.sock.sendPresenceUpdate('recording', jid);
                    
                    const timeout = setTimeout(async () => {
                        await this.safePresenceUpdate('paused', jid);
                        this.recordingSessions.delete(jid);
                    }, 8000);

                    this.recordingSessions.set(jid, timeout);
                } catch (error) {
                    // Silent fail
                }
            }
        });
    }

    // ❤️ AUTO-LIKE STATUS
    setupAutoLikeStatus() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autolike || m.type !== 'notify' || !m.messages.length) return;
        
            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autolike') || 0;
            if (now - lastTrigger < 3000) return;
            this.rateLimits.set('autolike', now);
            
            const statusMessages = m.messages.filter(msg => 
                msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe
            ).slice(0, 2);

            for (const msg of statusMessages) {
                try {
                    await this.sock.sendMessage(msg.key.remoteJid, {
                        react: {
                            text: '❤️',
                            key: msg.key
                        }
                    });
                    console.log(chalk.blue(`❤️ Auto-liked status from: ${msg.pushName || 'Unknown'}`));
                } catch (error) {
                    if (!error.message.includes('rate-overlimit')) {
                        console.log(chalk.yellow(`⚠️ Auto-like error: ${error.message}`));
                    }
                }
            }
        });
    }

    // 🎯 ENHANCED STATUS REACT SYSTEM
    setupStatusReact() {
        this.sock.ev.on('messages.upsert', async (m) => {
            if (!this.featureStates.autoreact || m.type !== 'notify' || !m.messages.length) return;

            // 🚀 RATE LIMITING
            const now = Date.now();
            const lastTrigger = this.rateLimits.get('autoreact') || 0;
            if (now - lastTrigger < 5000) return;
            this.rateLimits.set('autoreact', now);
            
            this.stats.autoreactTriggers++;

            const statusMessages = m.messages.filter(msg => 
                msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe
            ).slice(0, 2);

            for (const msg of statusMessages) {
                try {
                    // Add small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Use random reaction
                    const reactions = ['❤️', '🔥', '👏', '🎉', '👍'];
                    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];

                    await this.sock.sendMessage(msg.key.remoteJid, {
                        react: {
                            text: randomReaction,
                            key: msg.key
                        }
                    });

                    console.log(chalk.green(`🎯 Reacted ${randomReaction} to status from: ${msg.pushName || 'Unknown'}`));

                } catch (error) {
                    if (error.message.includes('rate-overlimit')) {
                        console.log(chalk.yellow('⚠️ Rate limit hit for status reactions'));
                    } else {
                        console.log(chalk.red(`❌ Status react error: ${error.message}`));
                    }
                }
            }
        });
    }

    // 🛡️ SAFE MESSAGE SENDING
    async safeSendMessage(jid, content, options = {}) {
        try {
            await this.sock.sendMessage(jid, content, options);
            return true;
        } catch (error) {
            this.stats.errors++;
            console.log(chalk.red(`❌ Send message error: ${error.message}`));
            return false;
        }
    }

    // 🛡️ SAFE PRESENCE UPDATE
    async safePresenceUpdate(type, jid) {
        try {
            await this.sock.sendPresenceUpdate(type, jid);
            return true;
        } catch (error) {
            this.stats.errors++;
            return false;
        }
    }

    // 🎯 FEATURE CONTROL SYSTEM
    toggleFeature(feature, enabled) {
        if (this.featureStates.hasOwnProperty(feature)) {
            this.featureStates[feature] = enabled;
            console.log(chalk.yellow(`🔧 ${feature} ${enabled ? 'ENABLED' : 'DISABLED'}`));
            return true;
        }
        return false;
    }

    toggleAllFeatures(enabled) {
        Object.keys(this.featureStates).forEach(feature => {
            this.featureStates[feature] = enabled;
        });
        console.log(chalk.yellow(`🔧 ALL FEATURES ${enabled ? 'ENABLED' : 'DISABLED'}`));
    }

    getFeatureState(feature) {
        return this.featureStates[feature];
    }

    getAllFeatureStates() {
        return { ...this.featureStates };
    }

    // 💾 STORE RECENT MESSAGE - CALL THIS FROM MESSAGE PROCESSOR!
    storeRecentMessage(msg) {
        if (msg.key?.id) {
            this.deletedMessages.set(msg.key.id, msg);
            this.stats.messagesStored++;
            console.log(chalk.blue(`💾 Stored message: ${msg.key.id.substring(0, 8)}... (Total: ${this.stats.messagesStored})`));
        }
    }

    // 📄 EXTRACT MESSAGE CONTENT
    extractMessageContent(msg) {
        try {
            const message = msg.message || msg;
            if (message.conversation) return message.conversation;
            if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
            if (message.imageMessage?.caption) return message.imageMessage.caption || '[Image]';
            if (message.videoMessage?.caption) return message.videoMessage.caption || '[Video]';
            if (message.audioMessage) return '[Audio]';
            if (message.documentMessage) return '[Document]';
            if (message.stickerMessage) return '[Sticker]';
            if (message.contactMessage) return '[Contact]';
            if (message.locationMessage) return '[Location]';
            return `[${Object.keys(message)[0]?.replace('Message', '')}]`;
        } catch {
            return '[Content]';
        }
    }

    // 📊 GET STATISTICS
    getStats() {
        return {
            ...this.stats,
            featureStates: this.getAllFeatureStates(),
            cacheSizes: {
                deletedMessages: this.deletedMessages.keys().length,
                typingSessions: this.typingSessions.size,
                recordingSessions: this.recordingSessions.size
            },
            activeUsers: this.typingSessions.size + this.recordingSessions.size
        };
    }

    // 🧹 CLEANUP
    cleanup() {
        // Clear all timeouts
        this.typingSessions.forEach(timeout => clearTimeout(timeout));
        this.recordingSessions.forEach(timeout => clearTimeout(timeout));
        
        // Clear all collections
        this.typingSessions.clear();
        this.recordingSessions.clear();
        this.rateLimits.clear();
        this.deletedMessages.flushAll();
        
        // Reset stats
        this.stats.antideleteTriggers = 0;
        this.stats.autoviewTriggers = 0;
        this.stats.autotypingTriggers = 0;
        this.stats.autorecordingTriggers = 0;
        this.stats.autoreactTriggers = 0;
        this.stats.messagesStored = 0;
        this.stats.errors = 0;
        this.stats.lastReset = Date.now();
        
        console.log(chalk.green('🧹 EventHandlers completely cleaned up'));
    }
}

module.exports = OptimizedEventHandlers;