// commands/tools/antigroupmentionkick.js
module.exports = {
    name: 'antigroupmentionkick',
    category: 'tools',
    description: 'Anti-group mention with kick',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antigroupmentionkick on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].antigroupmentionkick = state === 'on';
        reply(`✅ Anti-group mention kick ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};