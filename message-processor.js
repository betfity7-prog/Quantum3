// message-processor.js - WITH PROPER MESSAGE STORAGE FOR ANTIDELETE
const chalk = require("chalk");
const NodeCache = require('node-cache');

// 🚀 HIGH-PERFORMANCE MESSAGE QUEUES
class MessageQueue {
    constructor(concurrency = 25, timeout = 15000) {
        this.concurrency = concurrency;
        this.timeout = timeout;
        this.running = 0;
        this.queue = [];
        this.stats = {
            processed: 0,
            errors: 0,
            timeouts: 0,
            badMacErrors: 0
        };
    }

    async add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;

        this.running++;
        const { task, resolve, reject } = this.queue.shift();

        const timeoutPromise = new Promise((_, rej) => 
            setTimeout(() => {
                this.stats.timeouts++;
                rej(new Error('Queue timeout'));
            }, this.timeout)
        );

        try {
            const result = await Promise.race([task(), timeoutPromise]);
            this.stats.processed++;
            resolve(result);
        } catch (error) {
            this.stats.errors++;
            
            if (error.message.includes('Bad MAC')) {
                this.stats.badMacErrors++;
                console.log(chalk.yellow(`🛡️ Bad MAC handled in queue: ${error.message}`));
                resolve(null);
            } else {
                reject(error);
            }
        } finally {
            this.running--;
            this.process();
        }
    }

    get size() {
        return this.queue.length;
    }

    getStats() {
        return {
            ...this.stats,
            running: this.running,
            waiting: this.queue.length
        };
    }
}

// 🚀 OPTIMIZED CACHE SYSTEM
class OptimizedCache {
    constructor(ttl = 300, maxKeys = 5000) {
        this.cache = new NodeCache({
            stdTTL: ttl,
            checkperiod: 120,
            maxKeys: maxKeys,
            useClones: false
        });
        this.hits = 0;
        this.misses = 0;
    }

    set(key, value, ttl = null) {
        try {
            if (ttl) {
                this.cache.set(key, value, ttl);
            } else {
                this.cache.set(key, value);
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            this.hits++;
        } else {
            this.misses++;
        }
        return value;
    }

    del(key) {
        return this.cache.del(key);
    }

    keys() {
        return this.cache.keys();
    }

    getStats() {
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: this.hits / Math.max(1, this.hits + this.misses) * 100,
            size: this.cache.keys().length
        };
    }
}

// 🚀 HIGH-PERFORMANCE MESSAGE PROCESSOR WITH EVENT SYSTEM
const messageQueues = new Map();
const commandCache = new OptimizedCache(300, 3000);
const contextCache = new OptimizedCache(60, 1000);
const SUPER_OWNER = '237695717815';

class MessageProcessor {
    constructor() {
        this.commandSystem = null;
        this.initialized = false;
        this.eventControl = null;
        this.eventHandlers = null;
        this.stats = {
            totalProcessed: 0,
            totalErrors: 0,
            badMacHandled: 0,
            queueTimeouts: 0,
            sessionActivity: new Map(),
            performance: {
                avgProcessTime: 0,
                totalProcessTime: 0
            }
        };
        
        console.log(chalk.green('🚀 Message Processor initialized with event system support'));
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            const CommandSystem = require('./commands/index.js');
            this.commandSystem = new CommandSystem();
            this.initialized = true;
            
            console.log(chalk.green('✅ Command system loaded in message processor'));
        } catch (error) {
            console.error(chalk.red('❌ Message Processor init failed:'), error);
        }
    }

    // 🎯 INITIALIZE EVENT SYSTEM
    initializeEventSystem(sock) {
        try {
            const OptimizedEventHandlers = require('./eventHandlers.js');
            const EventControl = require('./event-control.js');
            
            this.eventHandlers = new OptimizedEventHandlers(sock);
            this.eventHandlers.setupAllHandlers();
            
            this.eventControl = new EventControl(this.eventHandlers);
            
            global.eventControl = this.eventControl;
            global.eventHandlers = this.eventHandlers;
            
            console.log(chalk.green('🎮 Event system initialized successfully'));
        } catch (error) {
            console.error(chalk.red('❌ Event system initialization failed:'), error);
        }
    }

    getQueue(sessionId) {
        if (!messageQueues.has(sessionId)) {
            messageQueues.set(sessionId, new MessageQueue(25, 15000));
        }
        return messageQueues.get(sessionId);
    }

    async processMessage(msg, sock, sessionId) {
        // 🛡️ STORE MESSAGE FOR ANTI-DELETE - THIS IS CRITICAL!
        if (global.eventHandlers && msg.key?.id) {
            global.eventHandlers.storeRecentMessage(msg);
            console.log(chalk.blue(`💾 Stored message for anti-delete: ${msg.key.id.substring(0, 8)}...`));
        }

        // 🛡️ ULTRA-FAST MESSAGE VALIDATION
        if (!this.isValidMessage(msg)) {
            return;
        }

        // Ensure system is initialized
        if (!this.initialized) {
            await this.initialize();
        }

        const queue = this.getQueue(sessionId);
        const startTime = Date.now();

        return queue.add(async () => {
            try {
                this.stats.totalProcessed++;
                this.updateSessionActivity(sessionId);

                // 🚀 CACHED MESSAGE PREPARATION
                const cacheKey = `msg_${sessionId}_${msg.key.id}`;
                let processedMsg = commandCache.get(cacheKey);
                
                if (!processedMsg) {
                    processedMsg = await this.prepareMessage(msg, sock);
                    commandCache.set(cacheKey, processedMsg, 60);
                }

                // Skip non-command messages quickly
                if (!processedMsg.body?.startsWith('.')) return;

                await this.handleCommand(processedMsg, sock, sessionId);

                // Update performance stats
                const processTime = Date.now() - startTime;
                this.updatePerformanceStats(processTime);

            } catch (error) {
                this.stats.totalErrors++;
                
                if (error.message.includes('Bad MAC')) {
                    this.stats.badMacHandled++;
                    console.log(chalk.yellow(`🛡️ Bad MAC recovered in ${sessionId}: ${error.message}`));
                    return;
                }
                
                if (error.message.includes('Queue timeout')) {
                    this.stats.queueTimeouts++;
                    console.log(chalk.yellow(`⏰ Queue timeout in ${sessionId}`));
                    return;
                }

                console.error(chalk.red(`❌ Critical error in ${sessionId}:`), error.message);
                await this.fallbackHandler(msg, sock, sessionId, error);
            }
        });
    }

    // 🎯 EVENT COMMANDS HANDLER
    async handleEventCommands(command, context, args) {
        if (!this.eventControl) {
            await context.reply('❌ Event system not initialized');
            return false;
        }
        
        const { reply } = context;
        
        switch(command) {
            case 'event':
                if (args[0] === 'all') {
                    const state = args[1] === 'on';
                    await this.eventControl.toggleAllFeatures(context, state);
                } else if (args[0] === 'stats') {
                    await this.eventControl.showStats(context);
                } else if (args[0] === 'cleanup') {
                    await this.eventControl.cleanup(context);
                } else if (args[0] === 'restart') {
                    await this.eventControl.restartEvents(context);
                } else {
                    const feature = args[0];
                    const state = args[1] === 'on' ? true : args[1] === 'off' ? false : null;
                    await this.eventControl.toggleFeature(context, feature, state);
                }
                return true;
                
            default:
                return false;
        }
    }

    async handleCommand(msg, sock, sessionId) {
        const body = msg.body || '';
        const command = body.slice(1).trim().split(' ')[0].toLowerCase();
        const args = body.slice(1).trim().split(' ').slice(1);
        
        console.log(chalk.cyan(`[CMD] ${msg.pushName} used: .${command} in ${sessionId}`));

        // 🚀 HANDLE EVENT COMMANDS FIRST
        if (command === 'event') {
            const context = await this.createCommandContext(msg, sock);
            const handled = await this.handleEventCommands(command, context, args);
            if (handled) return;
        }

        // 🚀 CACHED CONTEXT CREATION
        const contextKey = `ctx_${sessionId}_${msg.sender}`;
        let context = contextCache.get(contextKey);
        
        if (!context) {
            context = await this.createCommandContext(msg, sock);
            contextCache.set(contextKey, context, 30);
        }

        // 🔥 SUPER OWNER BYPASS - ULTRA FAST
        const senderNumber = msg.sender.split('@')[0];
        if (senderNumber === SUPER_OWNER) {
            await this.handleSuperOwnerCommand(command, context, args);
            return;
        }

        // 🚀 NORMAL COMMAND HANDLING
        if (this.commandSystem) {
            const handled = await this.commandSystem.handle(command, context);
            
            if (!handled) {
                await context.reply(`❌ Command *${command}* not found. Use *.menu* for available commands.`);
            }
        } else {
            await this.fallbackHandler(msg, sock, sessionId, new Error('Command system unavailable'));
        }
    }

    async handleSuperOwnerCommand(command, context, args) {
        console.log(chalk.green(`🎯 SUPER OWNER EXECUTING: .${command}`));
        
        const ownerCommands = {
            'addowner': () => this.addOwnerCommand(context, args),
            'addprem': () => this.addPremCommand(context, args),
            'delowner': () => this.delOwnerCommand(context, args),
            'delprem': () => this.delPremCommand(context, args),
            'self': async () => {
                if (this.commandSystem) {
                    this.commandSystem.setMode('self');
                    await context.reply('✅ SELF MODE ACTIVATED (Super Owner)');
                }
            },
            'public': async () => {
                if (this.commandSystem) {
                    this.commandSystem.setMode('public');
                    await context.reply('✅ PUBLIC MODE ACTIVATED (Super Owner)');
                }
            },
            'mode': async () => {
                const mode = this.commandSystem ? this.commandSystem.getMode() : 'public';
                await context.reply(`🔧 CURRENT MODE: ${mode.toUpperCase()}\n👑 YOU ARE SUPER OWNER`);
            },
            'stats': async () => {
                await this.showProcessorStats(context);
            },
            'cleanup': async () => {
                await this.cleanupProcessor(context);
            },
            'event': async () => {
                // Forward event commands to event system
                if (this.eventControl) {
                    const feature = args[0];
                    const state = args[1] === 'on' ? true : args[1] === 'off' ? false : null;
                    await this.eventControl.toggleFeature(context, feature, state);
                } else {
                    await context.reply('❌ Event system not available');
                }
            }
        };

        if (ownerCommands[command]) {
            await ownerCommands[command]();
        } else if (this.commandSystem) {
            await this.commandSystem.handle(command, context);
        }
    }

    isValidMessage(msg) {
        if (!msg || !msg.key || !msg.key.remoteJid) {
            return false;
        }

        if (msg.key.remoteJid === 'status@broadcast' || 
            msg.key.remoteJid === 'broadcast') {
            return false;
        }

        if (!msg.message && !msg.messageStubType) {
            return false;
        }

        try {
            const msgStr = JSON.stringify(msg.message || {});
            if (msgStr.includes('Bad MAC') || msgStr.includes('bad mac')) {
                this.stats.badMacHandled++;
                console.log(chalk.yellow(`🛡️ Bad MAC pre-filtered in ${msg.key.remoteJid}`));
                return false;
            }
        } catch {
            // Silent fail for JSON issues
        }

        return true;
    }

    async createCommandContext(msg, sock) {
        const from = msg.chat;
        const sender = msg.sender;
        const isGroup = msg.isGroup;
        const pushname = msg.pushName || "User";
        const botNumber = sock.user?.id;

        const senderNumber = sender.split('@')[0];
        const isCreator = senderNumber === SUPER_OWNER;

        const body = msg.body || '';
        const isCmd = body.startsWith('.');
        const command = isCmd ? body.slice(1).trim().split(' ')[0].toLowerCase() : '';
        const args = body.slice(1).trim().split(' ').slice(1);
        const text = args.join(' ');

        const reply = async (replyText, options = {}) => {
            try {
                await sock.sendMessage(from, { text: String(replyText) }, { quoted: msg, ...options });
            } catch (error) {
                console.error('🚀 Reply error:', error.message);
            }
        };

        return {
            m: msg,
            sock: sock,
            text: text,
            args: args,
            quoted: msg.quoted,
            mime: msg.mime,
            from: from,
            sender: sender,
            isGroup: isGroup,
            groupMetadata: msg.metadata,
            participants: msg.participants,
            pushname: pushname,
            isCreator: isCreator,
            isBotAdmins: msg.isBotAdmin,
            isAdmins: msg.isAdmin,
            botNumber: botNumber,
            reply: reply,
            db: global.db || { users: {}, groups: {}, settings: {}, chats: {} },
            userData: { 
                name: pushname, 
                premium: false, 
                limit: 10, 
                role: "user",
                usageCount: 0 
            },
            prefix: '.',
            command: command,
            commandSystem: this.commandSystem,
            eventControl: this.eventControl,
            axios: require('axios'),
            fetch: require('node-fetch')
        };
    }

    async prepareMessage(msg, sock) {
        const processedMsg = { ...msg };
        
        processedMsg.chat = msg.key.remoteJid || '';
        processedMsg.sender = msg.key.participant || msg.key.remoteJid || '';
        processedMsg.from = msg.key.remoteJid || '';
        processedMsg.isGroup = processedMsg.chat.endsWith('@g.us');
        processedMsg.prefix = '.';
        
        const messageContent = msg.message || {};
        processedMsg.body = messageContent.conversation || 
                           messageContent.extendedTextMessage?.text || 
                           messageContent.imageMessage?.caption ||
                           messageContent.videoMessage?.caption ||
                           '';

        if (!processedMsg.reply) {
            processedMsg.reply = async (text, options = {}) => {
                try {
                    await sock.sendMessage(processedMsg.chat, { text }, { 
                        quoted: processedMsg, 
                        ...options 
                    });
                } catch (error) {
                    console.error('🚀 Reply error:', error.message);
                }
            };
        }

        if (messageContent.extendedTextMessage?.contextInfo?.quotedMessage) {
            try {
                processedMsg.quoted = {
                    msg: messageContent.extendedTextMessage.contextInfo.quotedMessage,
                    sender: messageContent.extendedTextMessage.contextInfo.participant,
                    text: messageContent.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                          messageContent.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || ''
                };
            } catch (error) {
                processedMsg.quoted = null;
            }
        } else {
            processedMsg.quoted = null;
        }

        if (processedMsg.isGroup && processedMsg.chat && !processedMsg.metadata) {
            try {
                const metadata = await sock.groupMetadata(processedMsg.chat).catch(() => ({ 
                    participants: [] 
                }));
                processedMsg.metadata = metadata || {};
                processedMsg.participants = metadata?.participants || [];
                
                const userParticipant = processedMsg.participants.find(p => p.id === processedMsg.sender);
                processedMsg.isAdmin = userParticipant ? 
                    (userParticipant.admin === 'admin' || userParticipant.admin === 'superadmin') : false;
                
                const botParticipant = processedMsg.participants.find(p => p.id === sock.user?.id);
                processedMsg.isBotAdmin = botParticipant ? 
                    (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin') : false;
            } catch (error) {
                processedMsg.metadata = {};
                processedMsg.participants = [];
                processedMsg.isAdmin = false;
                processedMsg.isBotAdmin = false;
            }
        } else {
            processedMsg.metadata = processedMsg.metadata || {};
            processedMsg.participants = processedMsg.participants || [];
            processedMsg.isAdmin = processedMsg.isAdmin || false;
            processedMsg.isBotAdmin = processedMsg.isBotAdmin || false;
        }

        processedMsg.pushName = processedMsg.pushName || "User";
        return processedMsg;
    }

    async fallbackHandler(msg, sock, sessionId, error) {
        const body = msg.body?.toLowerCase() || '';
        if (!body.startsWith('.')) return;
        
        const command = body.slice(1).trim().split(' ')[0];
        
        console.log(chalk.yellow(`🔄 [${sessionId}] Fallback for: ${command} - ${error.message}`));
        
        try {
            const quickReplies = {
                'ping': '🏓 Pong! Bot is working!',
                'mode': `🔧 Current Mode: ${this.commandSystem?.getMode() || 'public'}`,
                'menu': `🤖 *ARCHIE-XMD BOT* (Fast Mode)\n\nUse *.ping* to check status\n*.mode* for current mode\n*.event* for event controls\n\n🚀 Optimized for 880+ users`,
                'stats': await this.getFallbackStats(),
                'event': '🎮 Event System Commands:\n.event - Show features\n.event stats - Show stats\n.event <feature> on/off - Toggle'
            };

            if (quickReplies[command]) {
                await sock.sendMessage(msg.chat, { text: quickReplies[command] }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.chat, { 
                    text: `❌ Command temporarily unavailable. Please try again later.` 
                }, { quoted: msg });
            }
        } catch (fallbackError) {
            console.error(chalk.red(`💥 Fallback failed: ${fallbackError.message}`));
        }
    }

    async getFallbackStats() {
        const activeSessions = Array.from(this.stats.sessionActivity.entries())
            .filter(([_, activity]) => Date.now() - activity.lastActivity < 5 * 60 * 1000)
            .length;

        return `
*🤖 BOT STATUS (Fallback Mode)*

📊 System Stats:
• Active Sessions: ${activeSessions}
• Total Processed: ${this.stats.totalProcessed}
• Command System: ${this.initialized ? '✅ Ready' : '❌ Loading'}
• Event System: ${this.eventControl ? '✅ Ready' : '❌ Loading'}

💡 Available Commands:
• .ping - Check bot status
• .mode - Check bot mode  
• .event - Event controls
• .menu - Show commands

🔄 System initializing, some features may be temporarily unavailable.
        `.trim();
    }

    updateSessionActivity(sessionId) {
        this.stats.sessionActivity.set(sessionId, {
            lastActivity: Date.now(),
            activityCount: (this.stats.sessionActivity.get(sessionId)?.activityCount || 0) + 1
        });
    }

    updatePerformanceStats(processTime) {
        this.stats.performance.totalProcessTime += processTime;
        this.stats.performance.avgProcessTime = 
            this.stats.performance.totalProcessTime / this.stats.totalProcessed;
    }

    getStats() {
        const activeSessions = Array.from(this.stats.sessionActivity.entries())
            .filter(([_, activity]) => Date.now() - activity.lastActivity < 5 * 60 * 1000)
            .length;

        return {
            ...this.stats,
            activeSessions: activeSessions,
            totalQueues: messageQueues.size,
            initialized: this.initialized,
            eventSystem: !!this.eventControl,
            cache: {
                command: commandCache.getStats(),
                context: contextCache.getStats()
            },
            queues: Array.from(messageQueues.entries()).map(([id, q]) => ({
                sessionId: id,
                stats: q.getStats()
            }))
        };
    }

    cleanupSession(sessionId) {
        messageQueues.delete(sessionId);
        this.stats.sessionActivity.delete(sessionId);
        
        const commandKeys = commandCache.keys().filter(key => key.includes(sessionId));
        const contextKeys = contextCache.keys().filter(key => key.includes(sessionId));
        
        commandKeys.forEach(key => commandCache.del(key));
        contextKeys.forEach(key => contextCache.del(key));
        
        console.log(chalk.green(`🧹 Cleaned up processor for session: ${sessionId}`));
    }

    startAutoCleanup() {
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            
            for (const [sessionId, activity] of this.stats.sessionActivity.entries()) {
                if (now - activity.lastActivity > 30 * 60 * 1000) {
                    this.cleanupSession(sessionId);
                    cleaned++;
                }
            }
            
            if (cleaned > 0) {
                console.log(chalk.blue(`🧹 Auto-cleanup: ${cleaned} inactive sessions`));
            }
        }, 5 * 60 * 1000);
    }
}

// 🚀 SINGLETON INSTANCE
const processor = new MessageProcessor();
processor.startAutoCleanup();

module.exports = {
    processMessage: (msg, sock, sessionId) => processor.processMessage(msg, sock, sessionId),
    prepareMessage: (msg, sock) => processor.prepareMessage(msg, sock),
    initializeEventSystem: (sock) => processor.initializeEventSystem(sock),
    handleBasicCommands: () => {},
    getStats: () => processor.getStats(),
    cleanupSession: (sessionId) => processor.cleanupSession(sessionId)
};