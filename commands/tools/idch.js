module.exports = {
    name: 'idch',
    category: 'tools',
    description: 'Check WhatsApp channel information',
    aliases: ['cekidch'],
    permission: 'all',
    async execute(context) {
        const { m, sock, text, reply } = context;
        
        if (!text) return reply("ᴄʜᴀɴɴᴇʟ ʟɪɴᴋ ?");
        if (!text.includes("https://whatsapp.com/channel/")) return reply("ʟɪɴᴋ ᴍᴜsᴛ ʙᴇ ᴠᴀʟɪᴅ");
        
        try {
            let result = text.split('https://whatsapp.com/channel/')[1];
            let res = await sock.newsletterMetadata("invite", result);
            
            let teks = `*CHANNEL INFO*\n\n*ɪᴅ :* ${res.id}\n*ɴᴀᴍᴇ :* ${res.name}\n*ғᴏʟʟᴏᴡᴇʀs :* ${res.subscribers}\n*sᴛᴀᴛᴜs :* ${res.state}\n*ᴠᴇʀɪғɪᴇᴅ :* ${res.verification == "VERIFIED" ? "✅ Yes" : "❌ No"}`;
            
            await reply(teks);
            
        } catch (error) {
            console.error(error);
            return reply("❌ Failed to fetch channel information");
        }
    }
};