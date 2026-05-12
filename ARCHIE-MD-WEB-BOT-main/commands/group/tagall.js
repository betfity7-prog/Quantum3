// commands/group/tagall.js
module.exports = {
    name: 'tagall',
    category: 'group',
    description: 'Mention all group members',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, text, isGroup, reply, mess, participants } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            let message = `📢 *MENTION ALL*\n${text || ''}\n\n`;
            participants.forEach(p => message += `@${p.id.split('@')[0]}\n`);
            
            await sock.sendMessage(m.chat, { 
                text: message, 
                mentions: participants.map(p => p.id) 
            });
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};