// commands/tools/welcome.js
module.exports = {
    name: 'welcome',
    category: 'tools',
    description: 'Welcome message settings',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .welcome on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        
        db.chats[m.chat].welcome = state === 'on';
        reply(`✅ Welcome messages ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};