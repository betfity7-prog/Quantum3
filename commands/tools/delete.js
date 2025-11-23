module.exports = {
    name: 'delete',
    category: 'group',
    description: 'Delete quoted message',
    aliases: ['d', 'del'],
    permission: 'admin',
    async execute(context) {
        const { m, sock, reply } = context;
        
        if (!m.quoted) return reply('ʀᴇᴘʟʏ ᴛᴇxᴛ ᴡɪᴛʜ ᴄᴏᴍᴍᴀɴᴅ');
        
        try {
            await sock.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    id: m.quoted.id,
                    participant: m.quoted.sender
                }
            });
        } catch (error) {
            console.error(error);
            return reply('❌ Failed to delete message');
        }
    }
};