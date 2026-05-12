module.exports = {
    name: 'mystats',
    category: 'tools',
    description: 'Check your user status and limits',
    permission: 'all',
    aliases: ['status', 'myinfo', 'info'],
    async execute(context) {
        const { reply, userData, pushname, sender, isCreator } = context;
        
        const role = userData?.role || 'user';
        const premium = userData?.premium || false;
        const limit = userData?.limit || 10;
        const expiry = userData?.premiumExpiry ? new Date(userData.premiumExpiry).toLocaleDateString() : 'N/A';

        let statusMessage = `👤 *USER STATS*\n\n`;
        statusMessage += `📛 Name: ${pushname}\n`;
        statusMessage += `🆔 ID: ${sender}\n`;
        statusMessage += `👑 Role: ${role.toUpperCase()}\n`;
        statusMessage += `⭐ Premium: ${premium ? 'Yes ✅' : 'No ❌'}\n`;
        statusMessage += `🎯 Command Limit: ${limit}\n`;
        
        if (premium) {
            statusMessage += `⏰ Premium Expires: ${expiry}\n`;
        }
        
        statusMessage += `\n${isCreator ? '👑 You are BOT OWNER' : ''}`;
        
        await reply(statusMessage);
    }
};