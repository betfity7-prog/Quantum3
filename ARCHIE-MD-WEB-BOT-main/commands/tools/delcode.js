// commands/tools/delcode.js
module.exports = {
    name: 'delcode',
    category: 'tools',
    description: 'Remove country code from allowed list',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        if (args.length < 1) return reply(`Example: .delcode <countryCode>`);
        const countryCode = args[0].replace(/[^0-9]/g, "");
        
        if (!countryCode || countryCode.length > 3) return reply("Invalid country code. Make sure it's 1-3 digits.");
        
        if (!db.chats[m.chat]?.allowedCodes) return reply("❌ No country codes are currently allowed in this group.");
        
        const codeIndex = db.chats[m.chat].allowedCodes.indexOf(countryCode);
        if (codeIndex === -1) return reply(`❌ Country code ${countryCode} is not in the allowed list.`);
        
        db.chats[m.chat].allowedCodes.splice(codeIndex, 1);
        reply(`✅ Country code ${countryCode} removed from allowed list.`);
    }
};