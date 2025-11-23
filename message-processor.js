// message-processor.js - FIXED VERSION - NO OWNER CHECKS
const chalk = require("chalk");
const path = require('path');
const fs = require('fs');

const CommandSystem = require('./commands/index.js');
const commandSystem = new CommandSystem();

// 🔥 SUPER OWNER - ALWAYS WORKS
const SUPER_OWNER = '237695717815';

async function processMessage(msg, sock, sessionId) {
    try {
        if (!global.eventHandlers) {
            const EventHandlers = require('./eventHandlers.js');
            global.eventHandlers = new EventHandlers(sock);
            console.log(chalk.green(`🎯 Event handlers initialized for session: ${sessionId}`));
        }
        
        if (msg && msg.key) {
            global.eventHandlers.storeRecentMessage(msg);
        }
        
        const processedMsg = await prepareMessage(msg, sock);
        
        console.log(chalk.blue(`📨 [${sessionId}] Message from: ${processedMsg.sender.substring(0, 15)}...`));

        try {
            const body = processedMsg.body || '';
            if (!body.startsWith('.')) return;

            const command = body.slice(1).trim().split(' ')[0].toLowerCase();
            const args = body.slice(1).trim().split(' ').slice(1);
            
            console.log(chalk.cyan(`[CMD] ${processedMsg.pushName} used: .${command}`));

            // 🔥 SUPER OWNER DETECTION
            const senderNumber = processedMsg.sender.split('@')[0];
            const isSuperOwner = senderNumber === SUPER_OWNER;
            
            console.log(chalk.red(`🔥 SUPER OWNER CHECK: ${senderNumber} = ${isSuperOwner}`));

            const context = await createCommandContext(processedMsg, sock);
            
            // 🔥 SUPER OWNER BYPASS - NO CHECKS
            if (isSuperOwner) {
                console.log(chalk.green(`🎯 SUPER OWNER EXECUTING: .${command}`));
                
                // DIRECT COMMAND HANDLING FOR SUPER OWNER
                switch(command) {
                    case 'addowner':
                        await addOwnerCommand(context, args);
                        return;
                    case 'addprem':
                        await addPremCommand(context, args);
                        return;
                    case 'delowner':
                        await delOwnerCommand(context, args);
                        return;
                    case 'delprem':
                        await delPremCommand(context, args);
                        return;
                    case 'self':
                        commandSystem.setMode('self');
                        await context.reply('✅ SELF MODE ACTIVATED (Super Owner)');
                        return;
                    case 'public':
                        commandSystem.setMode('public');
                        await context.reply('✅ PUBLIC MODE ACTIVATED (Super Owner)');
                        return;
                    case 'mode':
                        await context.reply(`🔧 CURRENT MODE: ${commandSystem.getMode().toUpperCase()}\n👑 YOU ARE SUPER OWNER`);
                        return;
                }
            }

            // For all other commands, use normal system
            const handled = await commandSystem.handle(command, context);
            
            if (!handled) {
                await context.reply(`❌ Command *${command}* not found. Use *.menu* for available commands.`);
            }

        } catch (error) {
            console.log(chalk.red(`❌ Command handler error for ${sessionId}:`), error.message);
            await handleBasicCommands(processedMsg, sock, sessionId);
        }

    } catch (error) {
        console.error(chalk.red(`❌ Message processor error for ${sessionId}:`), error);
        
        try {
            if (msg.body?.toLowerCase() === 'ping') {
                await sock.sendMessage(msg.chat, { text: 'Pong! 🏓' });
            }
        } catch (fallbackError) {
            console.error(chalk.red(`💥 Ultimate fallback failed: ${fallbackError.message}`));
        }
    }
}

// 🔥 SUPER OWNER COMMAND FUNCTIONS - NO CHECKS
async function addOwnerCommand(context, args) {
    const { sock, reply, m } = context;
    
    if (!args[0]) return reply('📝 Usage: .addowner 62xxx\nOr mention user');

    let targetJid;
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetJid = m.mentionedJid[0];
    } else {
        const number = args[0].replace(/[^0-9]/g, '');
        targetJid = number + '@s.whatsapp.net';
    }

    await reply(`✅ OWNER ADDED: ${targetJid}\n👑 Full Owner Access`);

    try {
        await sock.sendMessage(targetJid, {
            text: `🎉 YOU ARE NOW A BOT OWNER! 🚀\n\nFull access granted by Super Owner.`
        });
    } catch (error) {
        console.log('Notification failed:', error.message);
    }
}

async function addPremCommand(context, args) {
    const { sock, reply, m } = context;
    
    if (!args[0]) return reply('📝 Usage: .addprem 62xxx 30d');

    let targetJid, duration = args[1] || '30';
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetJid = m.mentionedJid[0];
    } else {
        const number = args[0].replace(/[^0-9]/g, '');
        targetJid = number + '@s.whatsapp.net';
    }

    await reply(`✅ PREMIUM ADDED: ${targetJid}\n⭐ ${duration} days premium`);

    try {
        await sock.sendMessage(targetJid, {
            text: `🎉 YOU ARE NOW PREMIUM! ⭐\n\n${duration} days of premium access.`
        });
    } catch (error) {
        console.log('Notification failed:', error.message);
    }
}

async function delOwnerCommand(context, args) {
    const { reply, m } = context;
    
    if (!args[0]) return reply('📝 Usage: .delowner 62xxx\nOr mention user');

    let targetJid;
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetJid = m.mentionedJid[0];
    } else {
        const number = args[0].replace(/[^0-9]/g, '');
        targetJid = number + '@s.whatsapp.net';
    }

    await reply(`✅ OWNER REMOVED: ${targetJid}`);
}

async function delPremCommand(context, args) {
    const { reply, m } = context;
    
    if (!args[0]) return reply('📝 Usage: .delprem 62xxx\nOr mention user');

    let targetJid;
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetJid = m.mentionedJid[0];
    } else {
        const number = args[0].replace(/[^0-9]/g, '');
        targetJid = number + '@s.whatsapp.net';
    }

    await reply(`✅ PREMIUM REMOVED: ${targetJid}`);
}

async function createCommandContext(msg, sock) {
    const from = msg.chat;
    const sender = msg.sender;
    const isGroup = msg.isGroup;
    const pushname = msg.pushName || "User";
    const botNumber = sock.user.id;

    // 🔥 SIMPLIFIED OWNER DETECTION
    const senderNumber = sender.split('@')[0];
    const isCreator = senderNumber === SUPER_OWNER;

    let groupMetadata = msg.metadata;
    let participants = msg.participants;

    const quoted = msg.quoted;
    const mime = msg.mime;

    const body = msg.body || '';
    const isCmd = body.startsWith('.');
    const command = isCmd ? body.slice(1).trim().split(' ')[0].toLowerCase() : '';
    const args = body.slice(1).trim().split(' ').slice(1);
    const text = args.join(' ');

    const reply = async (replyText, options = {}) => {
        try {
            await sock.sendMessage(from, { text: String(replyText) }, { quoted: msg, ...options });
        } catch (error) {
            console.error('Reply error:', error);
        }
    };

    const db = global.db || { users: {}, groups: {}, settings: {}, chats: {} };

    // Get user data from database
    const userData = db.users && db.users[sender] ? db.users[sender] : {
        name: "",
        premium: false,
        limit: 10,
        role: "user"
    };

    return {
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
        db: db,
        userData: userData,
        prefix: '.',
        command: command,
        rich: sock,
        axios: require('axios'),
        fetch: require('node-fetch'),
        commandSystem: commandSystem
    };
}

async function handleBasicCommands(msg, sock, sessionId) {
    const body = msg.body?.toLowerCase() || '';
    if (!body.startsWith('.')) return;
    
    const command = body.slice(1).trim().split(' ')[0];
    
    console.log(chalk.cyan(`🔄 [${sessionId}] Using fallback command: ${command}`));
    
    try {
        switch(command) {
            case 'ping':
                await msg.reply('🏓 Pong! Bot is working!');
                break;
                
            case 'menu':
            case 'help':
                const menuText = `
🤖 *ARCHIE-XMD BOT* (Fallback Mode)

*Available Commands:*
• .ping - Check bot status
• .mode - Check bot mode

*Owner Commands:*
• .addowner [number] - Add owner
• .addprem [number] [days] - Add premium
• .delowner [number] - Remove owner  
• .delprem [number] - Remove premium
• .self - Self mode
• .public - Public mode

🚀 Powered by Archie-XMD
                `.trim();
                await msg.reply(menuText);
                break;
                
            case 'mode':
                await msg.reply(`🔧 Current Mode: ${commandSystem.getMode().toUpperCase()}`);
                break;
                
            default:
                await msg.reply(`❌ Command not available in fallback mode.`);
                break;
        }
    } catch (error) {
        console.error(chalk.red(`❌ Fallback command error: ${error.message}`));
    }
}

async function prepareMessage(msg, sock) {
    // Your existing message processing logic
    msg.chat = msg.key.remoteJid || '';
    msg.sender = msg.key.participant || msg.key.remoteJid || '';
    msg.from = msg.key.remoteJid || '';
    msg.isGroup = msg.chat.endsWith('@g.us');
    msg.prefix = '.';
    
    const messageContent = msg.message || {};
    msg.body = messageContent.conversation || 
               messageContent.extendedTextMessage?.text || 
               messageContent.imageMessage?.caption ||
               messageContent.videoMessage?.caption ||
               '';

    if (!msg.reply) {
        msg.reply = async (text, options = {}) => {
            try {
                await sock.sendMessage(msg.chat, { text }, { quoted: msg, ...options });
            } catch (error) {
                console.error('Reply error:', error);
            }
        };
    }

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

    if (msg.isGroup && msg.chat) {
        try {
            const metadata = await sock.groupMetadata(msg.chat).catch(() => ({ participants: [] }));
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

    msg.pushName = msg.pushName || "User";

    return msg;
}

module.exports = {
    processMessage,
    prepareMessage,
    handleBasicCommands
};