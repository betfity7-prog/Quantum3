// commands/tools/antitagwarn.js
module.exports = {
    name: 'antitagwarn',
    category: 'tools',
    description: 'Anti-tag with warning',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antitagwarn on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].antitagwarn = state === 'on';
        reply(`✅ Anti-tag warning ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};