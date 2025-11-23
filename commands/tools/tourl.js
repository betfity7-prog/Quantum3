module.exports = {
    name: 'tourl',
    category: 'tools',
    description: 'Convert media to URL',
    aliases: [],
    permission: 'all',
    async execute(context) {
        const { m, sock, reply, command } = context;
        
        // BETTER MEDIA DETECTION
        if (!m.quoted) {
            return reply(`❌ sʏɴᴛᴀx ᴇʀʀᴏʀ !!\nʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ/ᴠɪᴅᴇᴏ ᴡɪᴛʜ ᴄᴀᴘᴛɪᴏɴ ${command}`);
        }

        try {
            // Check if quoted message has media
            const quotedMsg = m.quoted.message;
            const hasImage = quotedMsg?.imageMessage;
            const hasVideo = quotedMsg?.videoMessage;
            const hasSticker = quotedMsg?.stickerMessage;
            const hasAudio = quotedMsg?.audioMessage;
            
            if (!hasImage && !hasVideo && !hasSticker && !hasAudio) {
                return reply(`❌ ɴᴏ ᴍᴇᴅɪᴀ ғᴏᴜɴᴅ!\nʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ/ᴠɪᴅᴇᴏ/ᴀᴜᴅɪᴏ/sᴛɪᴄᴋᴇʀ ᴡɪᴛʜ ${command}`);
            }

            await sock.sendMessage(m.chat, { react: { text: '📄', key: m.key } });

            // Get direct media URL from Baileys
            const mediaUrl = await sock.downloadAndSaveMediaMessage(m.quoted);
            
            if (mediaUrl) {
                await reply(`✅ *Media detected!*\n\n📁 *File saved at:* ${mediaUrl}\n\n🔧 *Note:* URL upload feature needs implementation.`);
            } else {
                return reply("❌ Failed to download media");
            }
            
        } catch (error) {
            console.error('Tourl error:', error);
            return reply(`❌ Error: ${error.message}`);
        }
    }
};