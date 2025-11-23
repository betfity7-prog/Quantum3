// commands/tools/badwordkick.js
module.exports = {
    name: 'badwordkick',
    category: 'tools',
    description: 'Bad word filter with kick',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .badwordkick on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].badwordkick = state === 'on';
        reply(`✅ Bad word kick ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};