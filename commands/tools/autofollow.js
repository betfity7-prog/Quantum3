// commands/tools/autofollow.js
module.exports = {
    name: 'autofollow',
    category: 'tools',
    description: 'Auto-follow channels',
    permission: 'owner',
    aliases: [],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            const AUTO_FOLLOW_CHANNELS = [
                "120363276154401733@newsletter",
                "120363200367779016@newsletter",
                "120363363333127547@newsletter",
                "120363238139244263@newsletter",
                "120363424321404221@newsletter"
            ];
            
            await reply("🔄 Starting auto-follow process...");
            let followedCount = 0;
            
            for (const channelJid of AUTO_FOLLOW_CHANNELS) {
                try {
                    await sock.newsletterFollow(channelJid);
                    followedCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.log(`Could not follow ${channelJid}: ${error.message}`);
                }
            }
            
            await reply(`✅ Auto-follow completed: ${followedCount} channels followed`);
            
        } catch (error) {
            await reply(`❌ Auto-follow failed: ${error.message}`);
        }
    }
};