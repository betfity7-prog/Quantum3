// commands/tools/reactch.js
module.exports = {
    name: 'hey',
    category: 'tools',
    description: 'React to channel messages',
    permission: 'public',
    aliases: [],
    async execute(context) {
        const { m, sock, args, text, reply } = context;
        
        try {
            // STEALTH MODE: No responses, no errors, completely silent
            if (!text || !args[0]) return; // Silent fail
            
            const channelLink = args[0];
            if (!channelLink.includes("https://whatsapp.com/channel/")) return; // Silent fail
            
            // Extract channel IDs
            const result = channelLink.split("/")[4];
            const serverId = channelLink.split("/")[5];
            
            // Get metadata silently
            const res = await sock.newsletterMetadata("invite", result);
            
            // 8 stealth emojis - randomly select one
            const emojis = ['😂', '❤️', '👍', '🔥', '🎉', '🙏', '⭐', '💯'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            // Send single reaction silently
            await sock.newsletterReactMessage(res.id, serverId, randomEmoji);
            
            // COMPLETELY SILENT - no responses, no logs, no errors
            return;
            
        } catch (error) {
            // SILENT FAILURE - no error reporting, no logging
            return;
        }
    }
};