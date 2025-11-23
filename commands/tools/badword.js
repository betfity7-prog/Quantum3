// commands/tools/badword.js
module.exports = {
    name: 'badword',
    category: 'tools',
    description: 'Bad word filter',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .badword on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].badword = state === 'on';
        reply(`✅ Bad word filter ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};