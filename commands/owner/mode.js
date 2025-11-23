module.exports = {
    name: 'mode',
    category: 'tools',
    description: 'Check current bot mode',
    permission: 'all',
    aliases: ['status', 'botmode'],
    async execute(context) {
        const { reply, commandSystem, isCreator, userData } = context;
        
        const currentMode = commandSystem.getMode();
        const stats = commandSystem.getStats();
        
        await reply(
            `🤖 *BOT MODE STATUS*\n\n` +
            `📊 Mode: ${currentMode.toUpperCase()}\n` +
            `👑 Your Role: ${userData?.role || 'user'}\n` +
            `⭐ Premium: ${userData?.premium ? 'Yes' : 'No'}\n` +
            `🔧 Owner Access: ${isCreator ? 'Yes' : 'No'}\n` +
            `📁 Commands Loaded: ${stats.loaded}\n\n` +
            `${isCreator ? '👑 Owner Commands: .self / .public' : ''}`
        );
    }
};