// commands/tools/delallowed.js
module.exports = {
    name: 'delallowed',
    category: 'tools',
    description: 'Remove user from allowed list',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        let user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        if (!user) return reply("*Mention or reply to a user to remove from allowed link sender's list!*");
        
        if (!db.chats[from]?.allowedUsers || !db.chats[from].allowedUsers[user]) {
            return sock.sendMessage(from, {
                text: `❌ *@${user.split("@")[0]} is not in the allowed list.*`,
                contextInfo: { mentionedJid: [user] }
            }, { quoted: m });
        }
        
        delete db.chats[from].allowedUsers[user];
        
        await sock.sendMessage(from, {
            text: `✅ *@${user.split("@")[0]} is no longer allowed to send a link here.*`,
            contextInfo: { mentionedJid: [user] }
        }, { quoted: m });
    }
};