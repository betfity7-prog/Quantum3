// commands/tools/allow.js
module.exports = {
    name: 'allow',
    category: 'tools',
    description: 'Allow user to send links',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        let user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        if (!user) return reply("*Mention or reply to a user to allow to send a link!*");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        if (!db.chats[from].allowedUsers) db.chats[from].allowedUsers = {};
        if (!db.chats[from].allowedUsers[user]) db.chats[from].allowedUsers[user] = 0;
        
        db.chats[from].allowedUsers[user]++;
        
        await sock.sendMessage(from, {
            text: `✅ *@${user.split("@")[0]} has been allowed to send a link (${db.chats[from].allowedUsers[user]} chance(s)).*`,
            contextInfo: { mentionedJid: [user] }
        }, { quoted: m });
    }
};