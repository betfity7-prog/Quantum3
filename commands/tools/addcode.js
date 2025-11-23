// commands/tools/addcode.js
module.exports = {
    name: 'addcode',
    category: 'tools',
    description: 'Add country code to allowed list',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        if (args.length < 1) return reply(`Example: .addcode <countryCode>`);
        const countryCode = args[0].replace(/[^0-9]/g, "");
        
        if (!countryCode || countryCode.length > 3) return reply("Invalid country code. Make sure it's 1-3 digits.");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        if (!db.chats[m.chat].allowedCodes) db.chats[m.chat].allowedCodes = [];
        
        if (db.chats[m.chat].allowedCodes.includes(countryCode)) return reply(`❌ Country code ${countryCode} is already in the allowed list.`);
        
        db.chats[m.chat].allowedCodes.push(countryCode);
        reply(`✅ Country code ${countryCode} added to allowed list.`);
    }
};