// commands/owner/self.js
module.exports = {
    name: 'self',
    category: 'owner',
    description: 'Activate self mode (owner only)',
    permission: 'owner',
    aliases: ['privatemode'],
    async execute(context) {
        const { reply, commandSystem, isCreator } = context;
        
        console.log(`🔧 Self command executed by: ${context.sender}`);
        console.log(`🔧 isCreator: ${isCreator}`);
        
        const success = commandSystem.setMode('self');
        if (success) {
            await reply('✅ *SELF MODE ACTIVATED*\n\nOnly owner can use commands now.');
            console.log(`🔧 Self mode activated by owner: ${context.pushname}`);
        } else {
            await reply('❌ Failed to activate self mode');
        }
    }
};