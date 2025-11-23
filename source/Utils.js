/* 
📝 | Created By ARCHIETECH
🖥️ | Base Ori By ARCHIETECH
📌 | Credits ARCHIETECH
📱 | Chat wa:237695727815
👑 | Github: ARCHIE-TECH
✉️ | Email: archietech@gmail.com
*/

const chalk = require('chalk');

// Utility functions
function decodeJid(jid) {
    if (!jid) return jid;
    if (typeof jid !== 'string') return jid;
    
    try {
        // Remove any existing @s.whatsapp.net if present
        if (jid.includes('@s.whatsapp.net')) {
            return jid.split('@')[0];
        }
        // Remove any existing @g.us if present
        if (jid.includes('@g.us')) {
            return jid.split('@')[0];
        }
        return jid;
    } catch (error) {
        console.log(chalk.yellow('⚠️  decodeJid error:'), error.message);
        return jid;
    }
}

// Format phone number
function formatPhone(phone) {
    if (!phone) return phone;
    return phone.replace(/[^0-9]/g, '');
}

// Check if JID is group
function isGroup(jid) {
    return jid.endsWith('@g.us');
}

// Check if JID is user
function isUser(jid) {
    return jid.endsWith('@s.whatsapp.net');
}

// Get sender from message
function getSender(msg) {
    if (!msg) return '';
    if (msg.key?.fromMe) return 'bot';
    return msg.key?.participant || msg.key?.remoteJid || '';
}

// Get chat ID from message
function getChatId(msg) {
    if (!msg) return '';
    return msg.key?.remoteJid || '';
}

// Check if message is from group
function isGroupMessage(msg) {
    const chatId = getChatId(msg);
    return isGroup(chatId);
}

module.exports = {
    decodeJid,
    formatPhone,
    isGroup,
    isUser,
    getSender,
    getChatId,
    isGroupMessage
};