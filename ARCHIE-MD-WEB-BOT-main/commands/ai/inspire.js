// commands/ai/inspire.js
module.exports = {
    name: 'inspire',
    category: 'ai',
    description: 'Inspirational quotes',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { reply } = context;
        
        try {
            const quotes = [
                { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
                { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
                { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
                { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
                { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" }
            ];
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            
            await reply(`✨ *Inspirational Quote:*\n\n"${randomQuote.text}"\n— ${randomQuote.author}`);
        } catch (error) {
            await reply('❌ Failed to fetch an inspirational quote.');
        }
    }
};