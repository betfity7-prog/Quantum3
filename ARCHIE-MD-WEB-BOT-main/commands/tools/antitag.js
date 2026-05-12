// commands/tools/antitag.js
module.exports = {
    name: 'antitag',
    category: 'tools',
    description: 'Anti-tag protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .antitag on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        db.chats[from].antitag = state === 'on';
        reply(`✅ Anti-tag ${state === 'on' ? 'enabled' : 'disabled'}`);
    }
};