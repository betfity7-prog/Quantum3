const fs = require('fs');

module.exports = {
    name: 'take',
    category: 'tools',
    description: 'Create sticker with custom pack name',
    aliases: [],
    permission: 'all',
    async execute(context) {
        const { m, sock, args, reply, prefix, command } = context;
        
        if (!args.join(" ")) return reply(`\nᴇxᴇᴍᴘʟᴇ : ${prefix + command} 𝐍𝐈𝐂𝐊✞☯︎\n`);
        
        const swn = args.join(" ");
        const pcknm = swn.split("|")[0];
        const atnm = swn.split("|")[1];
        
        if (!m.quoted) return reply(`\nᴇxᴇᴍᴘʟᴇ : ʀᴇᴘʟʏ ɪᴍᴀɢᴇ/ᴠɪᴅᴇᴏ ${prefix + command}\n`);
        
        try {
            const mime = m.quoted.mimetype || '';
            
            if (m.quoted.isAnimated === true) {
                await sock.downloadAndSaveMediaMessage(m.quoted, "gifee");
                await sock.sendMessage(m.chat, {
                    sticker: fs.readFileSync("./gifee")
                }, {
                    packname: pcknm,
                    author: atnm
                });
                fs.unlinkSync("./gifee");
            } else if (/image/.test(mime)) {
                let media = await m.quoted.download();
                await sock.sendImageAsSticker(m.chat, media, m, {
                    packname: pcknm,
                    author: atnm
                });
            } else if (/video/.test(mime)) {
                if ((m.quoted.msg || m.quoted).seconds > 10) return reply('\nᴍᴀxɪᴍᴜᴍ ᴅᴜʀᴀᴛɪᴏɴ 10s\n');
                let media = await m.quoted.download();
                await sock.sendVideoAsSticker(m.chat, media, m, {
                    packname: pcknm,
                    author: atnm
                });
            } else {
                reply(`\nᴇxᴇᴍᴘʟᴇ : ʀᴇᴘʟʏ ɪᴍᴀɢᴇ/ᴠɪᴅᴇᴏ ${prefix + command}\n`);
            }
        } catch (error) {
            console.error(error);
            return reply('❌ Failed to create sticker');
        }
    }
};