// commands/ai/jokes.js
module.exports = {
    name: 'jokes',
    category: 'ai',
    description: 'Random jokes',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { reply } = context;
        
        try {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? He was outstanding in his field!",
                "Why don't eggs tell jokes? They'd crack each other up!",
                "What do you call a fake noodle? An impasta!",
                "Why did the math book look so sad? Because it had too many problems!"
            ];
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            await reply(`😄 *Joke of the Day:*\n\n${randomJoke}`);
        } catch (error) {
            await reply('❌ Failed to fetch a joke. Please try again later.');
        }
    }
};