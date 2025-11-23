// commands/ai/advice.js
module.exports = {
    name: 'advice',
    category: 'ai',
    description: 'Life advice',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { reply } = context;
        
        try {
            const adviceList = [
                "Take time to know yourself. When you know who you are, you can be wise about your goals, your dreams, your standards, and your convictions.",
                "A narrow focus brings big results. The number one reason people give up so fast is because they tend to look at how far they still have to go.",
                "Show up fully. Don't give up when you still have something to give. Nothing is really over until the moment you stop trying.",
                "Don't make assumptions. If you don't know the situation fully, you can't offer an informed opinion.",
                "Be patient and persistent. Life is not so much what you accomplish as what you overcome."
            ];
            const randomAdvice = adviceList[Math.floor(Math.random() * adviceList.length)];
            await reply(`💡 *Life Advice:*\n\n${randomAdvice}`);
        } catch (error) {
            await reply('❌ Oops, an error occurred while processing your request.');
        }
    }
};