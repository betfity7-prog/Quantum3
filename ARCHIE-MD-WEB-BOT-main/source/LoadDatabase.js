// source/LoadDatabase.js - ULTIMATE FIX

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function decodeJid(jid) {
    if (!jid) return jid;
    if (typeof jid !== 'string') return jid;
    try {
        if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) {
            return jid.split('@')[0];
        }
        return jid;
    } catch (error) {
        return jid;
    }
}

function isGroup(jid) {
    return jid.endsWith('@g.us');
}

function isUser(jid) {
    return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
}

function isNewsletter(jid) {
    return jid.endsWith('@newsletter');
}

async function LoadDataBase(conn, m) {
  try {
    const botNumber = decodeJid(conn.user?.id);
    const dbFile = './database.json';

    // Load from file or initialize
    if (fs.existsSync(dbFile)) {
        try {
            const fileData = fs.readFileSync(dbFile, 'utf8');
            global.db = JSON.parse(fileData);
            console.log(chalk.green('📁 Database loaded from file'));
        } catch (error) {
            console.error(chalk.red('❌ Error loading database file:'), error);
            global.db = { users: {}, groups: {}, settings: {}, chats: {} };
        }
    } else {
        global.db = { users: {}, groups: {}, settings: {}, chats: {} };
        console.log(chalk.yellow('📁 New database created'));
    }

    // Ensure proper structure
    if (typeof global.db !== 'object') global.db = {};
    if (typeof global.db.users !== 'object') global.db.users = {};
    if (typeof global.db.groups !== 'object') global.db.groups = {};
    if (typeof global.db.settings !== 'object') global.db.settings = {};
    if (typeof global.db.chats !== 'object') global.db.chats = {};

    // Initialize default settings
    const defaultSettings = { 
        welcome: false, 
        developer: [], 
        reseller: [], 
        bljpm: [], 
        respon: [],
        prefix: '.',
        owner: '237695727815'
    };
    
    for (let key in defaultSettings) {
      if (!(key in global.db.settings)) {
          global.db.settings[key] = defaultSettings[key];
      }
    }

    // Get sender and chat information safely
    const sender = m.sender || m.from || '';
    const chat = m.chat || m.key?.remoteJid || '';

    // 🔥 ULTIMATE OWNER DETECTION - NUMBER BASED
    const OWNER_NUMBERS = ['237695727815', '237695717815'];

    // Initialize user data - ONLY FOR REAL USERS
    if (sender && isUser(sender)) {
        if (typeof global.db.users[sender] !== 'object') {
            global.db.users[sender] = {};
        }

        const defaultUser = {
            name: m.pushName || '',
            premium: false,
            limit: 10,
            role: 'user'
        };

        for (let key in defaultUser) {
            if (!(key in global.db.users[sender])) {
                global.db.users[sender][key] = defaultUser[key];
            }
        }

        // 🔥 SET OWNER PRIVILEGES - CHECK NUMBER ONLY
        const senderNumber = sender.split('@')[0];
        if (OWNER_NUMBERS.includes(senderNumber) || sender === botNumber + '@s.whatsapp.net') {
            global.db.users[sender].premium = true;
            global.db.users[sender].limit = 9999;
            global.db.users[sender].role = 'owner';
            console.log(chalk.green(`👑 OWNER DETECTED: ${senderNumber}`));
        }
    }

    // Initialize chat data
    if (chat && typeof global.db.chats[chat] !== 'object') {
        global.db.chats[chat] = {};
    }

    // Handle group settings
    const isGroupChat = isGroup(chat);
    
    if (isGroupChat && chat) {
        if (typeof global.db.groups[chat] !== 'object') {
            global.db.groups[chat] = {};
        }
        
        const defaultGroup = { 
            antilink: false, 
            antilink2: false,
            welcome: false,
            mute: false,
            antiforeign: false,
            allowedCodes: [],
            allowedUsers: {},
            antibot: false,
            antitag: false,
            antitagwarn: false,
            antitagadmin: false,
            antitagadminwarn: false,
            antigroupmention: false,
            antigroupmentionkick: false,
            antigroupmentionwarn: false,
            badword: false,
            badwordkick: false,
            antidemote: false,
            antipromote: false,
            announcements: false,
            antilinkgc: false,
            antilinkgckick: false,
            name: '',
            memberCount: 0
        };
        
        for (let key in defaultGroup) {
            if (!(key in global.db.groups[chat])) {
                global.db.groups[chat][key] = defaultGroup[key];
            }
        }
    }

    // Save to file
    try {
        fs.writeFileSync(dbFile, JSON.stringify(global.db, null, 2));
        console.log(chalk.blue('💾 Database saved to file'));
    } catch (error) {
        console.error(chalk.red('❌ Error saving database:'), error);
    }

    // Return database information for debugging
    const userData = global.db.users[sender] || {};
    console.log(chalk.cyan(`🔍 FINAL USER DATA: ${sender} = ${JSON.stringify(userData)}`));

    return {
        botNumber,
        sender,
        chat,
        isGroup: isGroupChat,
        usersCount: Object.keys(global.db.users).length,
        groupsCount: Object.keys(global.db.groups).length,
        chatsCount: Object.keys(global.db.chats).length,
        userRole: userData.role || 'user',
        userPremium: userData.premium || false,
        cleaned: true
    };

  } catch (e) {
    console.error('❌ LoadDatabase Error:', e);
    return {
        botNumber: '',
        sender: m.sender || '',
        chat: m.chat || '',
        isGroup: false,
        usersCount: 0,
        groupsCount: 0,
        chatsCount: 0,
        userRole: 'user',
        userPremium: false,
        cleaned: false
    };
  }
}

module.exports = LoadDataBase;