// commands/group/demote.js
module.exports = {
    name: 'demote',
    category: 'group',
    description: 'Demote admin to member',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, text, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        let users = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                   (m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
        
        await sock.groupParticipantsUpdate(m.chat, [users], "demote");
        await reply(`User demoted successfully - Archie MD`);
    }
};