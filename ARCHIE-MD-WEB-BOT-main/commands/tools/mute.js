// commands/tools/mute.js
module.exports = {
    name: 'mute',
    category: 'tools',
    description: 'Mute group',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, args, isGroup, reply, mess, db } = context;
        if (!isGroup) return reply(mess.group);
        
        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) return reply(`Usage: .mute on/off`);
        
        if (!db.chats) db.chats = {};
        if (!db.chats[m.chat]) db.chats[m.chat] = {};
        
        db.chats[m.chat].mute = state === 'on';
        
        if (state === 'on') {
            await sock.groupSettingUpdate(m.chat, "announcement");
            reply(`✅ Group muted! Only admins can send messages.`);
        } else {
            await sock.groupSettingUpdate(m.chat, "not_announcement");
            reply(`✅ Group unmuted! All members can send messages.`);
        }
    }
};