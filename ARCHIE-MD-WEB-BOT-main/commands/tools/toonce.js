// commands/tools/toonce.js
module.exports = {
    name: 'toonce',
    category: 'tools',
    description: 'Convert to view once',
    permission: 'all',
    aliases: ['toviewonce'],
    async execute(context) {
        const { m, sock, quoted, mime, reply } = context;
        if (!quoted) return reply(`Reply Image/Video`);
        
        await sock.sendMessage(m.chat, { react: { text: `⏱️`, key: m.key } });
        
        if (/image/.test(mime)) {
            let media = await sock.downloadAndSaveMediaMessage(quoted);
            await sock.sendMessage(m.chat, {
                image: { url: media },
                caption: `Here it is!! - Archie MD`,
                viewOnce: true
            }, { quoted: m });
        } else if (/video/.test(mime)) {
            let media = await sock.downloadAndSaveMediaMessage(quoted);
            await sock.sendMessage(m.chat, {
                video: { url: media },
                caption: `Here it is!! - Archie MD`,
                viewOnce: true
            }, { quoted: m });
        }
    }
};