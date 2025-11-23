// commands/tools/ssweb.js
module.exports = {
    name: 'ssweb',
    category: 'tools',
    description: 'Take website screenshot',
    permission: 'all',
    aliases: ['ss'],
    async execute(context) {
        const { m, sock, args, reply, axios } = context;
        
        if (!args[0]) return reply('Provide URL\nExample: .ssweb https://google.com');
        
        try {
            await reply('📸 Taking screenshot...');
            const response = await axios.get(`https://image.thum.io/get/png/fullpage/viewportWidth/2400/${args[0]}`, {
                responseType: 'arraybuffer'
            });
            
            await sock.sendMessage(m.chat, { 
                image: response.data,
                caption: `🌐 Screenshot of ${args[0]}`
            });
        } catch (e) {
            reply('❌ Screenshot failed');
        }
    }
};