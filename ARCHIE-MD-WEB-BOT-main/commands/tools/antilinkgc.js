// commands/tools/antilinkgc.js
module.exports = {
    name: 'antilinkgc',
    category: 'tools',
    description: 'Anti-group link protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        if (args.length < 2) return reply("*Usage: .antilinkgc <delete/kick> <on/off>*");
        const mode = args[0].toLowerCase();
        const state = args[1].toLowerCase();
        
        if (!["delete", "kick"].includes(mode)) return reply("*Invalid mode! Use either 'delete' or 'kick'.*");
        if (!["on", "off"].includes(state)) return reply("*Invalid state! Use either 'on' or 'off'.*");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        if (state === "on") {
            if (mode === "delete") {
                db.chats[from].antilinkgc = true;
                db.chats[from].antilinkgckick = false;
            } else if (mode === "kick") {
                db.chats[from].antilinkgckick = true;
                db.chats[from].antilinkgc = false;
            }
            reply(`✅ *Anti-link GC ${mode} mode enabled!*`);
        } else if (state === "off") {
            if (mode === "delete") db.chats[from].antilinkgc = false;
            else if (mode === "kick") db.chats[from].antilinkgckick = false;
            reply(`✅ *Anti-link GC ${mode} mode disabled!*`);
        }
    }
};