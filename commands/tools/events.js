// commands/tools/events.js - Event Control Command
module.exports = {
    name: 'events',
    category: 'tools',
    description: 'Control event handlers and features',
    permission: 'all',
    aliases: ['event', 'ev'],
    usage: '.events <feature> on/off\n.events stats\n.events all on/off',
    
    async execute(context) {
        const { m, sock, text, args, reply, prefix, command } = context;
        
        // Check if event system is available
        if (!global.eventControl) {
            return reply('❌ Event system not initialized. Please contact bot owner.');
        }

        const subCommand = args[0]?.toLowerCase();
        
        switch(subCommand) {
            case 'stats':
            case 'status':
                await global.eventControl.showStats(context);
                break;
                
            case 'cleanup':
                await global.eventControl.cleanup(context);
                break;
                
            case 'restart':
                await global.eventControl.restartEvents(context);
                break;
                
            case 'all':
                const allState = args[1] === 'on'; // Renamed from 'state'
                await global.eventControl.toggleAllFeatures(context, allState);
                break;
                
            case undefined:
            case '':
                // Show feature list
                const featureStates = global.eventHandlers.getAllFeatureStates();
                const featureList = Object.entries(featureStates)
                    .map(([feature, enabled]) => { // Renamed from 'state'
                        const status = enabled ? '✅' : '❌';
                        const name = feature.charAt(0).toUpperCase() + feature.slice(1);
                        return `${status} ${name}`;
                    })
                    .join('\n');

                await reply(`🎮 *EVENT FEATURES CONTROL*\n\n${featureList}\n\n*Usage:*\n• ${prefix}events - Show this menu\n• ${prefix}events <feature> on/off - Toggle feature\n• ${prefix}events all on/off - Toggle all\n• ${prefix}events stats - Show statistics\n• ${prefix}events cleanup - Cleanup system\n• ${prefix}events restart - Restart events`);
                break;
                
            default:
                // Toggle individual feature
                const feature = subCommand;
                const featureState = args[1] === 'on' ? true : args[1] === 'off' ? false : null; // Renamed from 'state'
                
                if (featureState === null) {
                    await reply(`❌ Usage: ${prefix}events <feature> on/off\nExample: ${prefix}events antidelete on`);
                    return;
                }
                
                await global.eventControl.toggleFeature(context, feature, featureState);
                break;
        }
    }
};