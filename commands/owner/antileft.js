// commands/owner/antileft.js
module.exports = {
    name: 'antileft',
    category: 'owner',
    description: 'Anti-left protection system',
    permission: 'owner',
    aliases: [],
    async execute(context) {
        const { m, args, isGroup, reply } = context;
        
        if (!isGroup) {
            return await reply('❌ This command only works in groups');
        }
        
        const action = args[0]?.toLowerCase();
        
        switch (action) {
            case 'on': {
                await reply("🛡️ Activating anti-left protection...");
                global.eventHandlers.enableAntiLeft(m.chat);
                await reply('✅ Anti-left ACTIVATED!\nUsers will be automatically re-added when they leave.');
                break;
            }
            
            case 'off': {
                await reply("🛡️ Deactivating anti-left protection...");
                global.eventHandlers.disableAntiLeft(m.chat);
                await reply('❌ Anti-left DEACTIVATED!\nUsers can now leave without being re-added.');
                break;
            }
            
            case 'stats': {
                const stats = global.eventHandlers.getAntiLeftStats(m.chat);
                const isActive = global.eventHandlers.isAntiLeftEnabled(m.chat);
                
                await reply(`📊 *ANTI-LEFT STATS*\n\n✅ Users Re-added: ${stats.reAdded}\n🔒 Protection: ${isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
                break;
            }
            
            default: {
                await reply(`🛡️ *ANTI-LEFT SYSTEM*\n\nUsage:\n• .antileft on - Activate\n• .antileft off - Deactivate\n• .antileft stats - View status`);
                break;
            }
        }
    }
};