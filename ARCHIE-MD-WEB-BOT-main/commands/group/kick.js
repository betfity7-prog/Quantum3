// commands/group/kick.js
module.exports = {
    name: 'kick',
    category: 'group',
    description: 'Remove user from group',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, text, isGroup, reply } = context;
        if (!isGroup) return reply("This command only works in groups");
        
        let users = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                   (m.quoted ? m.quoted.sender : text.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
        
        await sock.groupParticipantsUpdate(m.chat, [users], "remove");
        await reply(`User removed successfully - Archie MD`);
    }
};