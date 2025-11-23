// commands/ai/trivia.js
module.exports = {
    name: 'trivia',
    category: 'ai',
    description: 'Trivia quiz',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { reply } = context;
        
        try {
            const triviaQuestions = [
                { question: "What is the capital of France?", answer: "Paris" },
                { question: "How many planets are in our solar system?", answer: "8" },
                { question: "What is the largest mammal in the world?", answer: "Blue Whale" },
                { question: "What year did World War II end?", answer: "1945" }
            ];
            const randomTrivia = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
            
            await reply(`🤔 *Trivia Time!*\n\n${randomTrivia.question}\n\n_I'll reveal the correct answer in 10 seconds..._`);
            
            setTimeout(async () => {
                await reply(`✅ *Correct Answer:* ${randomTrivia.answer}`);
            }, 10000);
            
        } catch (error) {
            await reply('❌ Error fetching trivia. Please try again later.');
        }
    }
};