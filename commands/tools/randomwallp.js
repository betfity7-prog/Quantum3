// commands/tools/randomwallp.js
module.exports = {
    name: 'random',
    category: 'tools',
    description: 'Get random wallpaper',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            const wallpapers = [
                'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-4.0.3&w=1200',
                'https://images.unsplash.com/photo-1426604966848-d7adac402bff?ixlib=rb-4.0.3&w=1200',
                'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?ixlib=rb-4.0.3&w=1200'
            ];
            const randomWallpaper = wallpapers[Math.floor(Math.random() * wallpapers.length)];
            
            await sock.sendMessage(m.chat, {
                image: { url: randomWallpaper },
                caption: "*🎲 RANDOM WALLPAPER*\n_POWERED BY ARCHIE MD_"
            });
        } catch (error) {
            await reply("❌ An error occurred while fetching random wallpaper.");
        }
    }
};