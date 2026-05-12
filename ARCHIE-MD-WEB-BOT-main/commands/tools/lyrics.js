// commands/tools/lyrics.js
module.exports = {
    name: 'lyrics',
    category: 'tools',
    description: 'Get song lyrics',
    permission: 'all',
    aliases: ['lyric', 'lirik'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        const songName = args.join(" ");
        
        if (!songName) {
            return await reply("*Please specify a song name!*\n\nUsage: .lyrics <song name>\nExample: .lyrics shape of you");
        }
        
        try {
            await reply("🎵 Searching for lyrics...");
            const lyrics = `🎵 *${songName}* - Artist Unknown\n\nLyrics service is being integrated...\n\nTry searching for popular songs like:\n• Shape of You\n• Blinding Lights\n• Dance Monkey`;
            await reply(lyrics);
        } catch (error) {
            console.log('Lyrics Error:', error);
            await reply("❌ Failed to fetch lyrics.");
        }
    }
};