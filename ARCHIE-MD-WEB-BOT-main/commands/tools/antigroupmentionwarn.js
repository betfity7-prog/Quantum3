// commands/tools/antigroupmentionwarn.js
module.exports = {
    name: 'antigroupmentionwarn',
    category: 'tools',
    description: 'Anti-group mention with warning',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antigroupmentionwarn on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].antigroupmentionwarn = state === 'on';
        reply(`✅ Anti-group mention warning ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};