// commands/tools/weather.js
module.exports = {
    name: 'weather',
    category: 'tools',
    description: 'Get weather information',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { m, sock, args, reply } = context;
        const location = args.join(" ") || 'Nairobi';
        
        try {
            await reply(`🌤️ Getting weather for *${location}*...`);
            const weatherImgUrl = `https://wttr.in/${encodeURIComponent(location)}.png?m`;
            
            await sock.sendMessage(m.chat, {
                image: { url: weatherImgUrl },
                caption: `*🌍 Weather for ${location}*\n📅 ${new Date().toLocaleString()}\n\n*Check the image for full details*`
            });
        } catch (error) {
            console.log('Weather Error:', error);
            await reply("❌ Failed to get weather data.");
        }
    }
};