// commands/group/add.js
module.exports = {
    name: 'add',
    category: 'group',
    description: 'Add user to group',
    permission: 'public',
    aliases: [],
    async execute(context) {
        const { m, sock, text, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        let user = m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        if (!user) return reply("Provide number to add");
        
        try {
            await sock.groupParticipantsUpdate(m.chat, [user], "add");
            reply(`✅ Added @${user.split('@')[0]}`);
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};