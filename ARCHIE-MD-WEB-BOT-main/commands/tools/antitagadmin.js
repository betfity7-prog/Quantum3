// commands/tools/antitagadmin.js
module.exports = {
    name: 'antitagadmin',
    category: 'tools',
    description: 'Anti-tag admin protection',
    permission: 'admin',
    aliases: ['antimentionadmin'],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db, from } = context;
        if (!isGroup) return reply(mess.group);
        
        if (args.length < 2) return reply("*Usage: .antitagadmin <delete/warn> <on/off>*");
        const mode = args[0].toLowerCase();
        const state = args[1].toLowerCase();
        
        if (!["delete", "warn"].includes(mode)) return reply("*Invalid mode! Use either 'delete' or 'warn'.*");
        if (!["on", "off"].includes(state)) return reply("*Invalid state! Use either 'on' or 'off'.*");
        
        if (!db.chats) db.chats = {};
        if (!db.chats[from]) db.chats[from] = {};
        
        if (state === "on") {
            if (mode === "delete") {
                db.chats[from].antitagadmin = true;
                db.chats[from].antitagadminwarn = false;
            } else if (mode === "warn") {
                db.chats[from].antitagadminwarn = true;
                db.chats[from].antitagadmin = false;
            }
            reply(`✅ *Anti-tagadmin ${mode} mode enabled!*`);
        } else if (state === "off") {
            if (mode === "delete") db.chats[from].antitagadmin = false;
            else if (mode === "warn") db.chats[from].antitagadminwarn = false;
            reply(`✅ *Anti-tagadmin ${mode} mode disabled!*`);
        }
    }
};