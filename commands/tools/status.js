// commands/tools/status.js - Enhanced Status Control
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'status',
    category: 'tools',
    description: 'Control auto status viewing and reactions',
    permission: 'owner',
    aliases: ['autostatus', 'astatus'],
    usage: '.status view on/off\n.status react on/off\n.status reactions ❤️,🔥,👏\n.status config',
    
    async execute(context) {
        const { m, sock, args, reply, prefix, command } = context;
        
        if (!global.eventHandlers) {
            return reply('❌ Event system not initialized');
        }

        const subCommand = args[0]?.toLowerCase();
        
        switch(subCommand) {
            case 'view':
                const viewState = args[1] === 'on';
                global.eventHandlers.toggleFeature('autoview', viewState);
                await reply(`✅ Auto status view ${viewState ? 'ENABLED' : 'DISABLED'}`);
                break;
                
            case 'react':
                const reactState = args[1] === 'on';
                global.eventHandlers.toggleFeature('autoreact', reactState);
                await reply(`✅ Status reactions ${reactState ? 'ENABLED' : 'DISABLED'}`);
                break;
                
            case 'reactions':
                const reactions = args.slice(1).join(' ').split(',').map(r => r.trim()).filter(r => r);
                if (reactions.length > 0) {
                    global.eventHandlers.updateStatusConfig({ reactions });
                    await reply(`✅ Status reactions updated: ${reactions.join(', ')}`);
                } else {
                    await reply('❌ Please provide reactions separated by commas\nExample: .status reactions ❤️,🔥,👏,🎉');
                }
                break;
                
            case 'config':
            case 'settings':
                const stats = global.eventHandlers.getStats();
                const config = stats.statusConfig;
                
                const configText = `
🎯 *STATUS CONFIGURATION*

📱 Auto View: ${stats.featureStates.autoview ? '✅' : '❌'}
💫 Auto React: ${stats.featureStates.autoreact ? '✅' : '❌'}
🎭 Reactions: ${config.reactions.join(', ')}

*Commands:*
• ${prefix}status view on/off - Toggle auto view
• ${prefix}status react on/off - Toggle reactions  
• ${prefix}status reactions ❤️,🔥,👏 - Set reactions
• ${prefix}status config - Show this menu
                `.trim();
                
                await reply(configText);
                break;
                
            default:
                await reply(`🎮 *STATUS CONTROL*\n\nUse:\n• ${prefix}status view on/off\n• ${prefix}status react on/off\n• ${prefix}status reactions ❤️,🔥,👏\n• ${prefix}status config`);
                break;
        }
    }
};