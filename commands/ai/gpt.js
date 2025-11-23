// commands/ai/gpt.js
module.exports = {
    name: 'gpt',
    category: 'ai',
    description: 'Chat with GPT',
    permission: 'all',
    aliases: ['ask', 'chat'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        const prompt = args.join(' ').trim();
        
        if (!prompt) return reply('💬 *Please provide a prompt to send to GPT.*\n\nExample:\n.gpt What is quantum computing?');
        
        try {
            const responseText = `🤖 *GPT Response:*\n\nI understand you're asking about "${prompt}". As an AI assistant integrated with Archie-MD, I can help with various topics. For real GPT responses, you would need to integrate with an actual GPT API service.\n\n💡 *Try:* .gpt explain quantum computing in simple terms`;
            await reply(responseText);
        } catch (err) {
            await reply('*❌ Error calling GPT:*\nPlease try again later.');
        }
    }
};