// commands/tools/antidemote.js
module.exports = {
    name: 'antidemote',
    category: 'tools',
    description: 'Anti-demote protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        if (args.length < 1) return reply(`Example: .antidemote on/off`);
        const option = args[0].toLowerCase();
        
        if (!["on", "off"].includes(option)) return reply("Invalid option");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        
        db.chats[m.chat].antidemote = option === "on";
        reply(`✅ Anti-demote ${option === "on" ? "enabled" : "disabled"} in this group`);
    }
};