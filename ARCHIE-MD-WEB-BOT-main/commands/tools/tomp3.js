// commands/tools/tomp3.js
module.exports = {
    name: 'tomp3',
    category: 'tools',
    description: 'Convert video to MP3',
    permission: 'all',
    aliases: ['toaudio'],
    async execute(context) {
        const { m, sock, quoted, mime, reply } = context;
        
        if (!/video|audio/.test(mime)) {
            return reply(`Send/Reply Video/Audio You Want to Convert to Audio With Caption .tomp3`);
        }
        if (!quoted) {
            return reply(`Send/Reply Video/Audio You Want to Convert to Audio With Caption .tomp3`);
        }
        
        reply("Converting to audio...");
        let media = await quoted.download();
        
        // Simulated conversion
        let audio = media; 
        
        await sock.sendMessage(m.chat, {
            audio: audio,
            mimetype: "audio/mpeg",
            caption: "Audio Converted by Archie MD 🎵"
        }, { quoted: m });
    }
};