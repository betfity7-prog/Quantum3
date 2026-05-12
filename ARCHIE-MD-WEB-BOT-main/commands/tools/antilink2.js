// commands/tools/antilink2.js
module.exports = {
    name: 'antilink2',
    category: 'tools',
    description: 'Alternative anti-link protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antilink2 on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        
        db.chats[m.chat].antilink2 = state === 'on';
        reply(`✅ Alternative anti-link ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};