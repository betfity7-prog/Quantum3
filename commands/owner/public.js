// commands/owner/public.js
module.exports = {
    name: 'public',
    category: 'owner',
    description: 'Activate public mode (owner only)',
    permission: 'owner',
    aliases: ['publicmode'],
    async execute(context) {
        const { reply, commandSystem, isCreator } = context;
        
        console.log(`🔧 Public command executed by: ${context.sender}`);
        console.log(`🔧 isCreator: ${isCreator}`);
        
        const success = commandSystem.setMode('public');
        if (success) {
            await reply('✅ *PUBLIC MODE ACTIVATED*\n\nAll users can use commands now.');
            console.log(`🔧 Public mode activated by owner: ${context.pushname}`);
        } else {
            await reply('❌ Failed to activate public mode');
        }
    }
};