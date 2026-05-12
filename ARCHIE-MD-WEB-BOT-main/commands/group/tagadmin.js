// commands/group/tagadmin.js
module.exports = {
    name: 'tagadmin',
    category: 'group',
    description: 'Mention all group admins',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess, participants } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            const admins = participants.filter(p => p.admin);
            if (admins.length === 0) return reply("❌ No admins found");
            
            let message = `👑 *GROUP ADMINS*\n\n`;
            admins.forEach((admin, i) => {
                message += `${i + 1}. @${admin.id.split('@')[0]}\n`;
            });
            
            await sock.sendMessage(m.chat, { 
                text: message, 
                mentions: admins.map(a => a.id) 
            });
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};