// commands/tools/antibot.js
module.exports = {
    name: 'antibot',
    category: 'tools',
    description: 'Anti-bot protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antibot on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].antibot = state === 'on';
        reply(`✅ Anti-bot ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};