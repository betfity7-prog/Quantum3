// commands/tools/listcode.js
module.exports = {
    name: 'listcode',
    category: 'tools',
    description: 'List allowed country codes',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, isCreator, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        if (!isCreator) return reply(mess.owner);
        
        const allowedCodes = db.chats[m.chat]?.allowedCodes || [];
        if (allowedCodes.length === 0) return reply("❌ No country codes are currently allowed in this group.");
        
        reply(`✅ Allowed country codes: ${allowedCodes.join(", ")}`);
    }
};