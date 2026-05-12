// commands/group/promote.js
module.exports = {
    name: 'promote',
    category: 'group',
    description: 'Promote user to admin',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, text, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        let target = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        if (!target) return reply("Mention user to promote");
        
        try {
            await sock.groupParticipantsUpdate(m.chat, [target], "promote");
            reply(`✅ Promoted @${target.split('@')[0]}`);
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};