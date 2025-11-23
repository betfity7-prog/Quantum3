// commands/tools/antigroupmention.js
module.exports = {
    name: 'antigroupmention',
    category: 'tools',
    description: 'Anti-group mention protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antigroupmention on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].antigroupmention = state === 'on';
        reply(`✅ Anti-group mention ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};