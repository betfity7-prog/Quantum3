// commands/tools/listpc.js
module.exports = {
    name: 'listpc',
    category: 'tools',
    description: 'List personal chats',
    permission: 'owner',
    aliases: ['chatlist'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            let teks = `💬 *PERSONAL CHAT LIST*\n\nTotal Chats: Processing...\n\n`;
            teks += `🔧 *Service Status:* Being integrated with database\n\n`;
            teks += `*Coming soon in next update!* - Archie MD`;
            
            await reply(teks);
        } catch (error) {
            reply('❌ Error fetching chat list');
        }
    }
};