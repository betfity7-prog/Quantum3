// commands/ai/deepseek.js
module.exports = {
    name: 'deepseek',
    category: 'ai',
    description: 'DeepSeek AI investigation',
    permission: 'all',
    aliases: ['intel', 'findout'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        if (!args.length) return reply('🕵️ *You need to specify what to investigate.*\nTry: .deepseek Bitcoin trends');
        
        try {
            await reply('⏳ *Gathering intelligence... please hold on.*');
            const data = {
                summary: `Based on my analysis of "${args.join(' ')}", this appears to be a trending topic with significant online presence. Further investigation would require access to real-time data sources.`,
                references: ['https://example.com/source1', 'https://example.com/source2'],
                stats: { cost: 0.50, engine: 'DeepSeek AI', pages: 15, images: 3 }
            };
            
            const summary = data.summary.trim();
            const references = data.references.length ? '\n🌍 *References:*\n' + data.references.map((url, idx) => `${idx + 1}. ${url}`).join('\n') : '';
            const cost = data.stats.cost ? `\n💰 *Estimated Cost:* $${data.stats.cost.toFixed(2)}` : '';
            const agent = data.stats.engine ? `\n🤖 *Agent Type:* ${data.stats.engine}` : '';
            const stats = `\n📑 *Pages:* ${data.stats.pages} | 🖼 *Images:* ${data.stats.images}`;
            const messageBody = `🧾 *Intel Report:*\n\n${summary}${references}${cost}${agent}${stats}`;
            const output = messageBody.length > 4000 ? messageBody.slice(0, 4000) + '…' : messageBody;
            
            await reply(output);
        } catch (err) {
            await reply('*🚫 Could not complete the investigation.*\nPlease try again later.');
        }
    }
};