const util = require("util");
const chalk = require("chalk");
const fs = require("fs");

const CommandSystem = require("./commands/index.js");
const commandSystem = new CommandSystem();

module.exports = async (m, sock) => {
    try {
        // Load database
        let db;
        try {
            const LoadDatabase = require("./source/LoadDatabase.js");
            db = await LoadDatabase(sock, m);
        } catch (dbError) {
            console.error(chalk.red('❌ Database load failed:'), dbError);
            db = { users: {}, groups: {}, settings: {}, chats: {} };
        }

        // 🎯 STORE MESSAGE FOR ANTI-DELETE
        if (global.eventHandlers && m.key?.id) {
            global.eventHandlers.storeRecentMessage(m);
        }

        // Message parsing
        const body = m.body || '';
        const isCmd = body.startsWith('.');
        const command = isCmd ? body.slice(1).trim().split(' ')[0].toLowerCase() : '';
        const args = body.slice(1).trim().split(' ').slice(1);
        const text = args.join(' ');

        if (!isCmd) return;

        // Basic info
        const from = m.chat;
        const sender = m.sender;
        const isGroup = m.isGroup;
        const pushname = m.pushName || "User";
        const botNumber = sock.user.id;

        console.log(chalk.blue(`[CMD] ${pushname} used: .${command}`));

        // Group metadata
        let groupMetadata = null;
        let participants = [];
        if (isGroup) {
            try {
                groupMetadata = await sock.groupMetadata(from);
                participants = groupMetadata.participants || [];
            } catch (e) {
                console.log('Failed to fetch group metadata:', e);
            }
        }

        // Permission checks
        const botParticipant = participants.find(p => p.id === botNumber);
        const isBotAdmins = botParticipant?.admin !== undefined;
        const userParticipant = participants.find(p => p.id === sender);
        const isAdmins = userParticipant?.admin !== undefined;

        // Quoted message
        const quoted = m.quoted || m;
        const mime = (quoted.msg || quoted).mimetype || '';

        // Reply function
        const reply = async (text, options = {}) => {
            try {
                await sock.sendMessage(from, { text: String(text) }, { quoted: m, ...options });
            } catch (error) {
                console.error('Reply error:', error);
            }
        };

        // Enhanced context with event system
        const context = {
            m, sock, text, args, quoted, mime,
            from, sender, isGroup, groupMetadata, participants, pushname,
            isCreator: commandSystem.isSuperOwner(sender),
            isBotAdmins, isAdmins, botNumber,
            reply, db,
            prefix: '.',
            command: command,
            rich: sock,
            axios: require('axios'),
            fetch: require('node-fetch'),
            commandSystem: commandSystem,
            eventControl: global.eventControl // 🆕 ADD EVENT CONTROL
        };

        // 🆕 EVENT COMMANDS HANDLING
        if (command === 'event') {
            if (global.eventControl) {
                if (args[0] === 'all') {
                    const state = args[1] === 'on';
                    await global.eventControl.toggleAllFeatures(context, state);
                    return;
                } else if (args[0] === 'stats') {
                    await global.eventControl.showStats(context);
                    return;
                } else if (args[0] === 'cleanup') {
                    await global.eventControl.cleanup(context);
                    return;
                } else if (args[0] === 'restart') {
                    await global.eventControl.restartEvents(context);
                    return;
                } else {
                    const feature = args[0];
                    const state = args[1] === 'on' ? true : args[1] === 'off' ? false : null;
                    await global.eventControl.toggleFeature(context, feature, state);
                    return;
                }
            } else {
                await reply('❌ Event system not initialized');
                return;
            }
        }

        // 🆕 DIRECT MODE COMMANDS - ALWAYS WORK FOR SUPER OWNER
        if (commandSystem.isSuperOwner(sender)) {
            console.log(chalk.green(`👑 SUPER OWNER executing: .${command}`));
            
            switch(command) {
                case 'self':
                    commandSystem.setMode('self');
                    await reply('✅ *SELF MODE ACTIVATED*\n\nOnly you can use commands now.');
                    return;
                    
                case 'public':
                    commandSystem.setMode('public');
                    await reply('✅ *PUBLIC MODE ACTIVATED*\n\nAll users can use commands now.');
                    return;
                    
                case 'mode':
                    const currentMode = commandSystem.getMode();
                    await reply(`🔧 *BOT MODE: ${currentMode.toUpperCase()}*\n\n👑 You are SUPER OWNER`);
                    return;
                    
                case 'event':
                    // Already handled above
                    return;
            }
        }

        // Use command system for all other commands
        const handled = await commandSystem.handle(command, context);

        if (!handled) {
            await reply(`❌ Command *${command}* not found. Use *.menu* for help.`);
        }

    } catch (err) {
        console.log(chalk.red('Skyzopedia Error:'), err);
        
        try {
            if (m && m.chat) {
                await sock.sendMessage(m.chat, { 
                    text: '❌ Command error occurred. Please try again.' 
                }, { quoted: m });
            }
        } catch (fallbackError) {
            console.error('Fallback reply failed:', fallbackError);
        }
    }
};

process.on("uncaughtException", (err) => {
    console.error("🛑 Exception:", err);
});

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.blue("🔄 Updated:"), __filename);
    delete require.cache[file];
    require(file);
});