// commands/tools/antiforeign.js
module.exports = {
    name: 'antiforeign',
    category: 'tools',
    description: 'Anti-foreign number protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        if (args.length < 1) return reply(`Example: .antiforeign on/off`);
        const option = args[0].toLowerCase();
        
        if (!["on", "off"].includes(option)) return reply("Invalid option");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        if (!db.chats[m.chat].allowedCodes) db.chats[m.chat].allowedCodes = [];
        
        db.chats[m.chat].antiforeign = option === "on";
        reply(`✅ Anti-foreign ${option === "on" ? "enabled" : "disabled"} in this group.\n\nTo manage country codes:\n• .addcode <code>\n• .delcode <code>\n• .listcode`);
    }
};