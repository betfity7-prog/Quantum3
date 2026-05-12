// commands/tools/bestwallp.js
module.exports = {
    name: 'bestwallp',
    category: 'tools',
    description: 'Get best wallpapers',
    permission: 'all',
    aliases: ['bestwal', 'best', 'bw'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            const wallpapers = [
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&w=1200',
                'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&w=1200',
                'https://images.unsplash.com/photo-1505142468610-359e7d316be0?ixlib=rb-4.0.3&w=1200'
            ];
            const randomWallpaper = wallpapers[Math.floor(Math.random() * wallpapers.length)];
            
            await sock.sendMessage(m.chat, {
                image: { url: randomWallpaper },
                caption: "*🖼️ BEST WALLPAPER*\n_POWERED BY ARCHIE MD_"
            });
        } catch (error) {
            await reply("❌ An error occurred while fetching wallpaper.");
        }
    }
};