process.on("uncaughtException", (err) => {
    console.error("🛑 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("🛑 Unhandled Rejection at:", promise, "reason:", reason);
});

// Load required modules
require("./settings.js");

// WEB INTEGRATION IMPORTS
const { broadcastStatus } = require('./server.js');
const pairingSystem = require('./pair.js');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const chalk = require("chalk");
const readline = require("readline");
const fs = require('fs');
const axios = require('axios');

// Database setup
const DataBase = require('./source/Database.js');
const database = new DataBase();

// Global caches
global.groupMetadataCache = new Map();
global.db = { users: {}, groups: {}, settings: {}, chats: {} };

// Newsletter configuration
const AUTO_FOLLOW_CHANNELS = [
    "120363276154401733@newsletter",
    "120363200367779016@newsletter",
];

const AUTO_JOIN_GROUPS = [
    "Ki3o3JiELjj98KjQDOG8uZ",
];

// Enhanced database loading
async function loadDatabase() {
    try {
        const load = await database.read() || {};
        global.db = {
            users: load.users || {},
            groups: load.groups || {},
            settings: load.settings || {},
            chats: load.chats || {}
        };
        await database.write(global.db);
        console.log(chalk.green('✅ Database loaded successfully'));
        return global.db;
    } catch (error) {
        console.error(chalk.red('❌ Database loading error:'), error);
        global.db = { users: {}, groups: {}, settings: {}, chats: {} };
        return global.db;
    }
}

// Enhanced InputNumber
async function InputNumber(promptText) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log(chalk.cyan("╔══════════════════════════════════╗"));
    console.log(chalk.cyan("║         PHONE NUMBER INPUT       ║"));
    console.log(chalk.cyan("╚══════════════════════════════════╝"));
    
    return new Promise((resolve) => {
        rl.question(chalk.yellow("✨ ") + chalk.white(promptText), (answer) => {
            rl.close();
            const cleaned = answer.replace(/[^0-9]/g, "");
            resolve(cleaned || "254");
        });
    });
}

let pairingPhoneNumber = null;

// Utility functions
function decodeJid(jid) {
    if (!jid || typeof jid !== 'string') return jid;
    return jid.split('@')[0];
}

function isGroup(jid) {
    return jid && jid.endsWith('@g.us');
}

function getSender(msg) {
    if (!msg) return '';
    if (msg.key?.fromMe) return 'bot';
    return msg.key?.participant || msg.key?.remoteJid || '';
}

// Newsletter following
async function followNewsletter(sock, channelJid) {
    try {
        console.log(chalk.blue(`🔄 Attempting to follow newsletter: ${channelJid}`));
        
        try {
            const result = await sock.newsletterFollow(channelJid);
            console.log(chalk.green(`✅ Successfully followed newsletter: ${channelJid}`));
            return true;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  newsletterFollow failed for ${channelJid}: ${error.message}`));
        }
        
        try {
            await sock.sendPresenceUpdate('available', channelJid);
            console.log(chalk.green(`✅ Sent presence to newsletter: ${channelJid}`));
            
            await sock.readMessages([{ key: { remoteJid: channelJid, id: '1' } }]);
            console.log(chalk.green(`✅ Sent read receipt to newsletter: ${channelJid}`));
            return true;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Presence method failed for ${channelJid}: ${error.message}`));
        }
        
        try {
            const metadata = await sock.newsletterMetadata(channelJid).catch(() => null);
            if (metadata) {
                console.log(chalk.green(`✅ Retrieved metadata for newsletter: ${metadata.name || channelJid}`));
                return true;
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Metadata method failed for ${channelJid}: ${error.message}`));
        }
        
        console.log(chalk.red(`❌ All follow methods failed for newsletter: ${channelJid}`));
        return false;
        
    } catch (error) {
        console.log(chalk.red(`💥 Critical error following newsletter ${channelJid}:`), error);
        return false;
    }
}

// Enhanced auto-follow function
async function autoFollowChannels(sock) {
    console.log(chalk.cyan('🔄 Starting auto-follow process...'));
    
    let followedCount = 0;
    let joinedCount = 0;
    
    for (const channelJid of AUTO_FOLLOW_CHANNELS) {
        console.log(chalk.blue(`📰 Processing newsletter: ${channelJid}`));
        const success = await followNewsletter(sock, channelJid);
        if (success) followedCount++;
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    for (const groupInvite of AUTO_JOIN_GROUPS) {
        try {
            console.log(chalk.blue(`👥 Joining group: ${groupInvite}`));
            await sock.groupAcceptInvite(groupInvite);
            console.log(chalk.green(`✅ Successfully joined group: ${groupInvite}`));
            joinedCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not join group ${groupInvite}: ${error.message}`));
            
            try {
                await sock.groupAcceptInviteV4(groupInvite);
                console.log(chalk.green(`✅ Successfully joined group via V4: ${groupInvite}`));
                joinedCount++;
            } catch (error2) {
                console.log(chalk.red(`❌ All group join methods failed for: ${groupInvite}`));
            }
        }
    }
    
    console.log(chalk.green(`🎯 Auto-follow completed: ${followedCount} newsletters followed, ${joinedCount} groups joined`));
}

// Enhanced message processing
async function processMessage(msg, sock) {
    try {
        if (!msg || !msg.key) return msg;

        msg.chat = msg.key.remoteJid || '';
        msg.sender = msg.key.participant || msg.key.remoteJid || '';
        msg.from = msg.key.remoteJid || '';
        msg.isGroup = isGroup(msg.key.remoteJid);
        msg.prefix = '.';
        
        const messageContent = msg.message || {};
        msg.body = messageContent.conversation || 
                   messageContent.extendedTextMessage?.text || 
                   messageContent.imageMessage?.caption ||
                   messageContent.videoMessage?.caption ||
                   messageContent.audioMessage?.caption ||
                   '';
        
        // Add reply method
        msg.reply = async (text, options = {}) => {
            try {
                await sock.sendMessage(msg.chat, { text: String(text) }, { quoted: msg, ...options });
            } catch (error) {
                console.error('Reply error:', error);
            }
        };

        if (messageContent.extendedTextMessage?.contextInfo?.quotedMessage) {
            try {
                msg.quoted = {
                    msg: messageContent.extendedTextMessage.contextInfo.quotedMessage,
                    sender: messageContent.extendedTextMessage.contextInfo.participant,
                    text: messageContent.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                          messageContent.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || ''
                };
            } catch (error) {
                msg.quoted = null;
            }
        } else {
            msg.quoted = null;
        }

        // Get MIME type
        msg.mime = (msg.msg || msg).mimetype || '';

        // Add pushName
        msg.pushName = msg.pushName || "User";

        if (msg.isGroup && msg.chat) {
            try {
                let metadata = global.groupMetadataCache.get(msg.chat);
                if (!metadata) {
                    metadata = await sock.groupMetadata(msg.chat).catch(() => ({ participants: [] }));
                    if (metadata) global.groupMetadataCache.set(msg.chat, metadata);
                }
                
                msg.metadata = metadata || {};
                msg.participants = metadata?.participants || [];
                
                const userParticipant = msg.participants.find(p => p.id === msg.sender);
                msg.isAdmin = userParticipant ? (userParticipant.admin === 'admin' || userParticipant.admin === 'superadmin') : false;
                
                const botNumber = sock.user?.id;
                const botParticipant = msg.participants.find(p => p.id === botNumber);
                msg.isBotAdmin = botParticipant ? (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin') : false;
                
            } catch (error) {
                msg.metadata = {};
                msg.participants = [];
                msg.isAdmin = false;
                msg.isBotAdmin = false;
            }
        } else {
            msg.metadata = {};
            msg.participants = [];
            msg.isAdmin = false;
            msg.isBotAdmin = false;
        }

        return msg;
    } catch (error) {
        console.error('Error in processMessage:', error);
        return {
            chat: msg?.key?.remoteJid || '',
            sender: msg?.key?.participant || msg?.key?.remoteJid || '',
            body: '',
            isGroup: false,
            isAdmin: false,
            isBotAdmin: false,
            metadata: {},
            participants: [],
            quoted: null,
            prefix: '.',
            pushName: "User",
            reply: async (text) => {
                try {
                    await sock.sendMessage(msg.chat, { text: String(text) }, { quoted: msg });
                } catch (error) {
                    console.error('Fallback reply error:', error);
                }
            }
        };
    }
}

// Enhanced command execution
async function executeCommand(msg, sock) {
    try {
        const body = msg.body || '';
        if (!body.startsWith('.')) return;

        const command = body.slice(1).trim().split(' ')[0].toLowerCase();
        const args = body.slice(1).trim().split(' ').slice(1);
        const text = args.join(' ');

        console.log(chalk.cyan(`[CMD] ${msg.pushName} used: .${command}`));

        // Basic info
        const from = msg.chat;
        const sender = msg.sender;
        const isGroup = msg.isGroup;
        const pushname = msg.pushName;
        const botNumber = sock.user.id;

        // Permission check
        let isCreator = false;
        if (global.owner) {
            if (Array.isArray(global.owner)) {
                isCreator = global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(sender);
            } else {
                isCreator = sender === global.owner.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }
        }
        isCreator = isCreator || sender === botNumber;

        // Group metadata
        let groupMetadata = msg.metadata;
        let participants = msg.participants;

        // Quoted message
        const quoted = msg.quoted;
        const mime = msg.mime;

        // Reply function
        const reply = async (text, options = {}) => {
            try {
                await sock.sendMessage(from, { text: String(text) }, { quoted: msg, ...options });
            } catch (error) {
                console.error('Reply error:', error);
            }
        };

        // Message templates
        const mess = {
            group: "❌ This command only works in groups!",
            owner: "❌ Owner only command!",
            admin: "❌ Bot needs admin rights!",
            notadmin: "❌ You need to be admin!",
            done: "✅ Done!"
        };

        // Load database
        const db = global.db;

        // Enhanced context with all required parameters
        const context = {
            m: msg,
            sock: sock,
            text: text,
            args: args,
            quoted: quoted,
            mime: mime,
            from: from,
            sender: sender,
            isGroup: isGroup,
            groupMetadata: groupMetadata,
            participants: participants,
            pushname: pushname,
            isCreator: isCreator,
            isBotAdmins: msg.isBotAdmin,
            isAdmins: msg.isAdmin,
            botNumber: botNumber,
            reply: reply,
            mess: mess,
            db: db,
            prefix: '.',
            command: command,
            rich: sock,
            axios: axios,
            fetch: require('node-fetch')
        };

        // Load and execute command
        try {
            delete require.cache[require.resolve("./commands.js")];
            const commands = require("./commands.js");
            
            const handled = await commands.handle(command, context);
            
            if (!handled) {
                await reply(`❌ Command *${command}* not found. Use *.menu* for available commands.`);
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ Command execution error: ${error.message}`));
            await reply(`❌ Error executing command: ${error.message}`);
        }

    } catch (error) {
        console.error(chalk.red('❌ Command processor error:'), error);
    }
}

// Fallback command handler
async function handleFallbackCommands(msg, sock) {
    const body = msg.body?.toLowerCase() || '';
    if (!body.startsWith('.')) return;

    const command = body.slice(1).trim().split(' ')[0];
    
    try {
        switch(command) {
            case 'ping':
                await msg.reply('🏓 Pong! Archie-MD Bot is working!');
                break;
                
            case 'menu':
            case 'help':
                const menuText = `
🤖 *ARCHIE-MD BOT MENU*

*Basic Commands:*
• .ping - Check bot status
• .menu - Show this menu

*Group Management:*
• .add [number] - Add user to group
• .kick [@user] - Remove user from group
• .promote [@user] - Make user admin
• .demote [@user] - Remove admin
• .tagall - Mention all members

*Media Commands:*
• .song [name] - Download music
• .ssweb [url] - Screenshot website
• .tourl [media] - Upload media to URL

*Fun Commands:*
• .jokes - Random jokes
• .advice - Life advice
• .trivia - Quiz game

🚀 Powered by Archie-XMD
                `.trim();
                await msg.reply(menuText);
                break;
                
            default:
                await msg.reply(`❌ Command *${command}* not found. Use *.menu* for available commands.`);
                break;
        }
    } catch (error) {
        console.error('Fallback command error:', error);
    }
}

// Main bot function
async function startBot() {
    console.log(chalk.blue('🔄 Starting bot initialization...'));
    
    await loadDatabase();
    
    const { state, saveCreds } = await useMultiFileAuthState("./sessions");
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
        printQRInTerminal: true
    });

    sock.decodeJid = decodeJid;
    sock.getSender = getSender;
    sock.isGroup = isGroup;
    sock.public = true;

    sock.ev.on("creds.update", saveCreds);

    // Connection handler WITH WEB INTEGRATION
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        console.log(chalk.blue("🔗 Connection state:"), connection);
        
        // WEB INTEGRATION - Broadcast status to dashboard
        if (connection === "connecting") {
            broadcastStatus('connecting');
        } else if (connection === "open") {
            broadcastStatus('online', sock.user?.name || 'Connected');
            pairingSystem.clearCodes();
        } else if (connection === "close") {
            broadcastStatus('offline');
        }
        
        if (qr) {
            pairingSystem.generateQRCode(qr);
        }
        
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            
            console.error(chalk.red("🔴 Connection closed:"), lastDisconnect?.error?.message || 'Unknown error');

            switch (statusCode) {
                case DisconnectReason.badSession:
                    console.log(chalk.red("❌ Bad Session, deleting and restarting..."));
                    try {
                        if (fs.existsSync("./sessions")) {
                            fs.rmSync("./sessions", { recursive: true, force: true });
                        }
                    } catch (e) {}
                    setTimeout(() => process.exit(1), 3000);
                    break;
                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                case DisconnectReason.restartRequired:
                case DisconnectReason.timedOut:
                    console.log(chalk.yellow("🔄 Reconnecting in 5 seconds..."));
                    setTimeout(startBot, 5000);
                    break;
                case DisconnectReason.loggedOut:
                    console.log(chalk.red("🔒 Logged out, cleaning session..."));
                    try {
                        if (fs.existsSync("./sessions")) {
                            fs.rmSync("./sessions", { recursive: true, force: true });
                        }
                    } catch (e) {}
                    setTimeout(() => process.exit(1), 3000);
                    break;
                default:
                    console.log(chalk.yellow("🔄 Reconnecting in 10 seconds..."));
                    setTimeout(startBot, 10000);
            }
        } 
        else if (connection === "connecting") {
            console.log(chalk.yellow("🔄 Connecting to WhatsApp..."));
        }
        else if (connection === "open") {
            console.clear();
            console.log(chalk.green("╔══════════════════════════════════╗"));
            console.log(chalk.green("║     BOT SUCCESSFULLY CONNECTED   ║"));
            console.log(chalk.green("╚══════════════════════════════════╝"));
            console.log(chalk.cyan("🤖 Bot: ARCHIE-XMD"));
            console.log(chalk.cyan("👤 User: " + (sock.user?.name || "Unknown")));
            console.log(chalk.cyan("📱 Number: " + (sock.user?.id.split(':')[0] || "Unknown")));
            console.log(chalk.cyan("🌐 Mode: " + (sock.public ? "Public" : "Self")));
            
            pairingPhoneNumber = null;

            // Start autofollow with delay
            setTimeout(() => {
                console.log(chalk.cyan('🚀 Starting auto-follow sequence...'));
                autoFollowChannels(sock).catch(error => {
                    console.log(chalk.red('❌ Auto-follow error:'), error);
                });
            }, 4000);
        }
    });

    // Pairing code handling
    if (!sock.authState.creds.registered && pairingPhoneNumber) {
        setTimeout(async () => {
            try {
                console.log(chalk.blue("📱 Requesting pairing code for:"), pairingPhoneNumber);
                const code = await sock.requestPairingCode(pairingPhoneNumber);
                console.log(chalk.magenta("╔══════════════════════════════════╗"));
                console.log(chalk.magenta("║           PAIRING CODE           ║"));
                console.log(chalk.magenta("╚══════════════════════════════════╝"));
                console.log(chalk.cyan("🔐 PAIRING CODE: ") + chalk.yellow(code));
                console.log(chalk.green("✅ Go to WhatsApp → Linked Devices → Link a Device"));
            } catch (error) {
                console.log(chalk.red("❌ Failed to get pairing code:"), error.message);
            }
        }, 3000);
    }

    // FIXED Message handler - Using enhanced processor
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m.messages || !Array.isArray(m.messages) || m.messages.length === 0) return;

            const msg = m.messages[0];
            if (!msg.message || !msg.key?.remoteJid || msg.key.remoteJid === 'status@broadcast') return;
            
            console.log(chalk.blue('📨 Message from:'), msg.key.remoteJid.substring(0, 20) + '...');
            
            // Process message with enhanced processor
            const processedMsg = await processMessage(msg, sock);
            
            // Check if bot is in public mode
            if (!sock.public) {
                const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";
                if (processedMsg.sender !== botNumber && processedMsg.sender.split("@")[0] !== global.owner) return;
            }
            
            // Execute command
            await executeCommand(processedMsg, sock);
            
        } catch (err) {
            console.log(chalk.red("❌ Message handler error:"), err);
            
            // Ultimate fallback
            try {
                const processedMsg = await processMessage(m.messages[0], sock);
                await handleFallbackCommands(processedMsg, sock);
            } catch (fallbackError) {
                console.log(chalk.red('💥 Ultimate fallback failed:'), fallbackError);
            }
        }
    });

    return sock;
}

// Main application
async function main() {
    console.log(chalk.cyan("╔══════════════════════════════════╗"));
    console.log(chalk.cyan("║        STARTING ARCHIE-XMD       ║"));
    console.log(chalk.cyan("║            🤖 BOT 🤖            ║"));
    console.log(chalk.cyan("╚══════════════════════════════════╝"));
    
    try {
        pairingPhoneNumber = await pairingSystem.inputNumber("Enter your phone number (e.g., 237xxxx): ");
        
        if (!pairingPhoneNumber) {
            console.log(chalk.red("❌ Phone number is required"));
            process.exit(1);
        }
        
        console.log(chalk.blue("📱 Using phone number: +" + pairingPhoneNumber));
        
        let retries = 3;
        while (retries > 0) {
            try {
                await startBot();
                break;
            } catch (error) {
                retries--;
                console.error(chalk.red(`❌ Bot startup failed (${retries} retries left):`), error.message);
                
                if (retries === 0) {
                    console.log(chalk.red('💥 Maximum retries reached. Exiting.'));
                    process.exit(1);
                }
                
                console.log(chalk.yellow(`🔄 Retrying in 5 seconds...`));
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
    } catch (error) {
        console.error(chalk.red('💥 Fatal error:'), error);
        process.exit(1);
    }
}

// Database auto-save
setInterval(async () => {
    if (global.db) {
        try {
            await database.write(global.db);
            console.log(chalk.green('💾 Database auto-saved'));
        } catch (error) {
            console.error(chalk.red('❌ Database save error:'), error);
        }
    }
}, 30000);

// Clear cache periodically
setInterval(() => {
    global.groupMetadataCache.clear();
    console.log(chalk.blue('🧹 Cleared group metadata cache'));
}, 600000);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🔄 Shutting down gracefully...'));
    try {
        if (global.db) {
            await database.write(global.db);
            console.log(chalk.green('💾 Database saved before shutdown'));
        }
        process.exit(0);
    } catch (error) {
        console.error(chalk.red('❌ Shutdown error:'), error);
        process.exit(1);
    }
});

// Start the bot
main().catch(error => {
    console.error(chalk.red('💥 Failed to start bot:'), error);
    process.exit(1);
});