// commands/owner/features.js
module.exports = {
    name: 'features',
    category: 'owner',
    description: 'Control bot features',
    permission: 'owner',
    aliases: ['feature', 'settings'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        const feature = args[0]?.toLowerCase();
        const action = args[1]?.toLowerCase();
        
        const availableFeatures = {
            'antidelete': '🗑️ Anti-delete messages',
            'autoview': '👀 Auto-view status',
            'autotyping': '⌨️ Auto-typing indicator', 
            'autorecording': '🎙️ Auto-recording indicator',
            'autolike': '💖 Auto-like status',
            'antileft': '🛡️ Anti-left protection'
        };
        
        if (!feature) {
            let statusMessage = `🔧 *FEATURE CONTROL PANEL*\n\n`;
            const features = global.eventHandlers?.getAllFeatures?.() || {};
            
            for (const [key, desc] of Object.entries(availableFeatures)) {
                const isEnabled = features[key];
                statusMessage += `${desc}: ${isEnabled ? '🟢 ON' : '🔴 OFF'}\n`;
            }
            
            statusMessage += `\n*Usage:* .features <feature> on/off\n*Example:* .features antidelete off`;
            await reply(statusMessage);
            return;
        }
        
        if (!availableFeatures[feature]) {
            await reply(`❌ Unknown feature: ${feature}\n\nAvailable features: ${Object.keys(availableFeatures).join(', ')}`);
            return;
        }
        
        if (action === 'on' || action === 'off') {
            const enabled = action === 'on';
            const success = global.eventHandlers?.toggleFeature(feature, enabled);
            
            if (success) {
                await reply(`✅ ${availableFeatures[feature]} ${enabled ? 'ENABLED' : 'DISABLED'}`);
            } else {
                await reply(`❌ Failed to toggle ${feature}`);
            }
        } else {
            const isEnabled = global.eventHandlers?.getFeatureState(feature);
            await reply(`🔧 ${availableFeatures[feature]}: ${isEnabled ? '🟢 ON' : '🔴 OFF'}`);
        }
    }
};