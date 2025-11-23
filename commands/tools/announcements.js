// commands/tools/announcements.js
module.exports = {
    name: 'announcements',
    category: 'tools',
    description: 'Group announcements control',
    permission: 'owner',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, isCreator, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        if (!isCreator) return reply(mess.owner);
        
        if (args.length < 1) return reply(`Example: .announcements on/off`);
        const option = args[0].toLowerCase();
        
        if (!["on", "off"].includes(option)) return reply("Invalid option");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        
        db.chats[m.chat].announcements = option === "on";
        reply(`✅ Announcements ${option === "on" ? "enabled" : "disabled"} for this group`);
    }
};