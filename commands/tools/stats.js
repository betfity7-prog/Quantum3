// commands/tools/stats.js
module.exports = {
    name: 'stats',
    category: 'tools',
    description: 'Show bot statistics',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            const commandSystem = require('../index.js');
            const stats = commandSystem.getStats();
            
            const memoryUsage = process.memoryUsage();
            const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            
            const statsMessage = `
📊 *BOT STATISTICS*

🤖 *Command System:*
• Total Commands: ${stats.loaded}
• Categories: ${Object.keys(stats.categories).length}
• Errors: ${stats.errors}

💾 *Memory Usage:*
• Used: ${usedMB} MB
• Total: ${totalMB} MB

📈 *Performance:*
• Uptime: ${Math.round(process.uptime())} seconds
• Platform: ${process.platform}
• Node.js: ${process.version}

🎯 *Categories Breakdown:*
${Object.entries(stats.categories).map(([cat, count]) => `• ${cat}: ${count} commands`).join('\n')}

🚀 *Powered by Archie-MD Web Bot*
            `.trim();
            
            await reply(statsMessage);
            
        } catch (error) {
            await reply(`❌ Error getting statistics: ${error.message}`);
        }
    }
};