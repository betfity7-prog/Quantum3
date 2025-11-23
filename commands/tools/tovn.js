// commands/tools/tovn.js
module.exports = {
    name: 'tovn',
    category: 'tools',
    description: 'Convert to voice note',
    permission: 'all',
    aliases: ['toptt'],
    async execute(context) {
        const { m, sock, quoted, mime, reply } = context;
        
        if (!/video|audio/.test(mime)) {
            return reply(`Reply Video/Audio That You Want To Convert to Voice Note With Caption .tovn`);
        }
        if (!quoted) {
            return reply(`Reply Video/Audio That You Want To Convert to Voice Note With Caption .tovn`);
        }
        
        reply("Converting to voice note...");
        let media = await quoted.download();
        
        // Simulated conversion
        let audio = media;
        
        await sock.sendMessage(m.chat, {
            audio: audio,
            mimetype: "audio/mpeg",
            ptt: true,
            caption: "Voice Note by Archie MD 🎤"
        }, { quoted: m });
    }
};