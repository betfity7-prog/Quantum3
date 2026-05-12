// commands/owner/unblock.js
module.exports = {
    name: 'unblock',
    category: 'owner', 
    description: 'Unblock user',
    permission: 'owner',
    aliases: [],
    async execute(context) {
        const { m, sock, text, quoted, reply, mess } = context;
        
        if (!quoted && !text) return reply(`Tag someone or provide number!`);
        let users = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                   (quoted ? quoted.sender : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net');
        
        await sock.updateBlockStatus(users, 'unblock');
        await reply(`✅ User unblocked!`);
    }
};