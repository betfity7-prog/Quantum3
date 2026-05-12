// commands/group/close.js
module.exports = {
    name: 'close',
    category: 'group',
    description: 'Close group (admins only)',
    permission: 'public',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            await sock.groupSettingUpdate(m.chat, "announcement");
            reply("✅ Group closed! Only admins can send messages.");
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};