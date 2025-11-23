// commands/tools/antipromote.js
module.exports = {
    name: 'antipromote',
    category: 'tools',
    description: 'Anti-promote protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        if (args.length < 1) return reply(`Example: .antipromote on/off`);
        const option = args[0].toLowerCase();
        
        if (!["on", "off"].includes(option)) return reply("Invalid option");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        
        db.chats[m.chat].antipromote = option === "on";
        reply(`✅ Anti-promote ${option === "on" ? "enabled" : "disabled"}`);
    }
};