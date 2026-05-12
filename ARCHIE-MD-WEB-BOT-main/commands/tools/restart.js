// commands/tools/restart.js
module.exports = {
    name: 'restart',
    category: 'tools',
    description: 'Restart bot system',
    permission: 'owner',
    aliases: [],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            await reply("🔄 Restarting bot system...");
            
            // Clear command cache and reload
            const commandSystem = require('../index.js');
            const oldStats = commandSystem.getStats();
            
            // Force reload all commands
            for (const category of commandSystem.categories) {
                const commandFiles = require('fs').readdirSync(`./commands/${category}`).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const commandPath = `./commands/${category}/${file}`;
                    delete require.cache[require.resolve(commandPath)];
                }
            }
            
            // Reload command system
            delete require.cache[require.resolve('../index.js')];
            const newCommandSystem = require('../index.js');
            const newStats = newCommandSystem.getStats();
            
            await reply(`✅ System restarted!\n\nBefore: ${oldStats.loaded} commands\nAfter: ${newStats.loaded} commands\n\n🔄 All commands reloaded successfully!`);
            
        } catch (error) {
            await reply(`❌ Restart failed: ${error.message}`);
        }
    }
};