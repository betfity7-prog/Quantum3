// commands/group/link.js
module.exports = {
    name: 'link',
    category: 'group',
    description: 'Get group invite link',
    permission: 'public',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            let code = await sock.groupInviteCode(m.chat);
            reply(`🔗 https://chat.whatsapp.com/${code}`);
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};