/*
📝 | Created By Quantum Tech
🖥️ | Base Ori By Quantum Tech
📌 | Credits Quantum Tech
📱 | Chat wa:+254703712475
👑 | Github: Quantum-Tech
✉️ | Email: quantumtech@gmail.com
*/

// Bot Configuration
global.owner = "254703712475";
global.botname = "Quantum Bot";
global.website = "https://github.com/Quantum-Tech";

// Menu Configuration
global.MENU_IMAGE_URL = "https://files.catbox.moe/5h0zdt.png";
global.BOT_NAME = "QUANTUM WEB BOT";
global.MODE = "public"; // FIXED: Default mode - will be used by command system
global.PREFIX = ".";
global.version = "3.0.0";
global.DESCRIPTION = "🚀 Powered by Quantum Web Bot | Multi-session WhatsApp Bot";

// Channel Configuration
global.CHANNEL_JID = "120363276154401733@newsletter";
global.CHANNEL_NAME = "QUANTUM BOT";

// Database Configuration
global.tempatDB = "database.json";

// Auto-follow Channels (Newsletters)
global.AUTO_FOLLOW_CHANNELS = [
    "120363276154401733@newsletter",
    "120363200367779016@newsletter",
];

// Auto-join Groups
global.AUTO_JOIN_GROUPS = [
    "Fq5wUB89hLY9y0puEpCL0O",
];

// Web Server Configuration
global.WEB_PORT = process.env.PORT || 3000;
global.WEB_SECRET = "quantum-bot-secret-2024";

// Session Configuration
global.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// FIXED: Export for external use with enhanced mode support
module.exports = {
    owner: global.owner,
    botname: global.botname,
    website: global.website,
    tempatDB: global.tempatDB,
    AUTO_FOLLOW_CHANNELS: global.AUTO_FOLLOW_CHANNELS,
    AUTO_JOIN_GROUPS: global.AUTO_JOIN_GROUPS,
    WEB_PORT: global.WEB_PORT,
    WEB_SECRET: global.WEB_SECRET,
    SESSION_TIMEOUT: global.SESSION_TIMEOUT,
    MENU_IMAGE_URL: global.MENU_IMAGE_URL,
    BOT_NAME: global.BOT_NAME,
    MODE: global.MODE,
    PREFIX: global.PREFIX,
    version: global.version,
    DESCRIPTION: global.DESCRIPTION,
    CHANNEL_JID: global.CHANNEL_JID,
    CHANNEL_NAME: global.CHANNEL_NAME,
    
    // FIXED: Enhanced functions for mode management
    getMode: () => global.MODE,
    setMode: (newMode) => {
        if (['public', 'self'].includes(newMode)) {
            global.MODE = newMode;
            return true;
        }
        return false;
    },
    
    // FIXED: Owner validation helper
    isOwner: (jid) => {
        const ownerJid = typeof global.owner === 'string' 
            ? [global.owner] 
            : global.owner;
        
        const ownerJids = ownerJid.map(owner => {
            const cleanNumber = owner.replace(/[^0-9]/g, '');
            return cleanNumber + '@s.whatsapp.net';
        });
        
        return ownerJids.includes(jid);
    }
};