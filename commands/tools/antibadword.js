// commands/tools/antibadword.js
module.exports = {
    name: 'antibadword',
    category: 'tools',
    description: 'Anti-bad word protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antibadword on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].antibadword = state === 'on';
        reply(`✅ Anti-badword ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};