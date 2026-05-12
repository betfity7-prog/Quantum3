// commands/owner/autostatus.js
module.exports = {
    name: 'autostatus',
    category: 'owner',
    description: 'Auto-status settings',
    permission: 'owner',
    aliases: [],
    async execute(context) {
        const { m, sock, args, reply } = context;
        const action = args[0]?.toLowerCase();
        const subAction = args[1]?.toLowerCase();
        
        if (!action) {
            const autoview = global.eventHandlers?.getFeatureState('autoview');
            const autolike = global.eventHandlers?.getFeatureState('autolike');
            
            await reply(`📱 *AUTO STATUS SETTINGS*\n\n👀 Auto-view: ${autoview ? '🟢 ON' : '🔴 OFF'}\n💖 Auto-like: ${autolike ? '🟢 ON' : '🔴 OFF'}\n\nUsage:\n.autostatus view on/off - Toggle auto-view\n.autostatus like on/off - Toggle auto-like`);
            return;
        }
        
        if (action === 'view') {
            if (subAction === 'on' || subAction === 'off') {
                const enabled = subAction === 'on';
                global.eventHandlers?.toggleFeature('autoview', enabled);
                await reply(`✅ Auto-view status ${enabled ? 'ENABLED' : 'DISABLED'}`);
            } else {
                const isEnabled = global.eventHandlers?.getFeatureState('autoview');
                await reply(`👀 Auto-view status: ${isEnabled ? '🟢 ON' : '🔴 OFF'}`);
            }
        } 
        else if (action === 'like') {
            if (subAction === 'on' || subAction === 'off') {
                const enabled = subAction === 'on';
                global.eventHandlers?.toggleFeature('autolike', enabled);
                await reply(`✅ Auto-like status ${enabled ? 'ENABLED' : 'DISABLED'}`);
            } else {
                const isEnabled = global.eventHandlers?.getFeatureState('autolike');
                await reply(`💖 Auto-like status: ${isEnabled ? '🟢 ON' : '🔴 OFF'}`);
            }
        }
        else if (action === 'on' || action === 'off') {
            const enabled = action === 'on';
            global.eventHandlers?.toggleFeature('autoview', enabled);
            global.eventHandlers?.toggleFeature('autolike', enabled);
            await reply(`✅ All auto-status features ${enabled ? 'ENABLED' : 'DISABLED'}`);
        }
        else {
            await reply('❌ Invalid command! Use:\n.autostatus view on/off\n.autostatus like on/off\n.autostatus on/off');
        }
    }
};