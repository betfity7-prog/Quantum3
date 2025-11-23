// commands/tools/listallowed.js
module.exports = {
    name: 'listallowed',
    category: 'tools',
    description: 'List allowed users',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        if (!db.chats[from]?.allowedUsers || Object.keys(db.chats[from].allowedUsers).length === 0) {
            return reply("*No users are currently allowed to send links.*");
        }
        
        let allowedUsers = Object.entries(db.chats[from].allowedUsers)
            .map(([user, count]) => `@${user.split("@")[0]} (${count} chance(s))`)
            .join("\n");
        
        await sock.sendMessage(from, {
            text: `📋 *Allowed Users List:*\n\n${allowedUsers}`,
            contextInfo: { mentionedJid: Object.keys(db.chats[from].allowedUsers) }
        }, { quoted: m });
    }
};