// commands/group/open.js
module.exports = {
    name: 'open',
    category: 'group',
    description: 'Open group for all members',
    permission: 'public',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            await sock.groupSettingUpdate(m.chat, "not_announcement");
            reply("✅ Group opened! Members can send messages.");
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};