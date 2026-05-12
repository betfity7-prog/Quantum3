// commands/tools/song.js
module.exports = {
    name: 'song',
    category: 'tools',
    description: 'Download music',
    permission: 'all',
    aliases: ['play', 'mp3', 'audio', 'music'],
    async execute(context) {
        const { m, sock, text, reply, fetch } = context;
        
        try {
            if (!text) {
                return await reply("*🎵 SONG DOWNLOADER*\n\nUsage: .song <song name>\nExample: .song shape of you");
            }
            
            await reply('🔍 Searching for audio...');
            const apiUrl = `https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${encodeURIComponent(text)}`;
            const res = await fetch(apiUrl);
            const data = await res.json();
            
            if (!data?.success || !data?.result?.downloadUrl) {
                return await reply('❌ Audio not found!');
            }
            
            const meta = data.result.metadata;
            const dlUrl = data.result.downloadUrl;
            const caption = `*🎵 AUDIO INFO*\n\n📝 Title: ${meta.title}\n👤 Channel: ${meta.channel}\n⏱️ Duration: ${meta.duration}`;
            
            await reply(caption);
            await reply('⬇️ Downloading audio...');
            
            await sock.sendMessage(m.chat, { 
                audio: { url: dlUrl },
                mimetype: 'audio/mpeg',
                fileName: `${meta.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 80)}.mp3`
            });
            
        } catch (error) {
            console.error('Song Error:', error);
            await reply('❌ Download failed');
        }
    }
};