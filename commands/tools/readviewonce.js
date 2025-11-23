const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'readviewonce',
    category: 'tools',
    description: 'Retrieve view once media',
    aliases: ['vv', '•'],
    permission: 'all',
    async execute(context) {
        const { m, sock, reply, downloadContentFromMessage } = context;
        
        try {
            // Check if message is quoted
            if (!m.quoted) {
                return reply("ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴠɪᴇᴡ ᴏɴᴄᴇ ᴍᴇᴅɪᴀ");
            }

            // Extract quoted message from your structure
            const quoted = m.quoted.message;
            const quotedImage = quoted?.imageMessage;
            const quotedVideo = quoted?.videoMessage;

            if (quotedImage && quotedImage.viewOnce) {
                // Download and send the image
                const stream = await downloadContentFromMessage(quotedImage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(m.chat, { 
                    image: buffer, 
                    fileName: 'media.jpg', 
                    caption: quotedImage.caption || '🟢 RETRIEVED BY LORD EAGLE✞☯︎ ✅' 
                }, { quoted: m });
                
            } else if (quotedVideo && quotedVideo.viewOnce) {
                // Download and send the video
                const stream = await downloadContentFromMessage(quotedVideo, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(m.chat, { 
                    video: buffer, 
                    fileName: 'media.mp4', 
                    caption: quotedVideo.caption || '🟢 RETRIEVED BY LORD EAGLE✞☯︎ ✅' 
                }, { quoted: m });
                
            } else {
                await reply("❌ Please reply to a view-once image or video.");
            }
            
        } catch (error) {
            console.error('View once error:', error);
            return reply("❌ Failed to retrieve view once media");
        }
    }
};