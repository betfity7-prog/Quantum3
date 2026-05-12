const chalk = require('chalk');
const NodeCache = require('node-cache');

class EventControl {
    constructor(eventHandlers) {
        this.eventHandlers = eventHandlers;
        this.statsCache = new NodeCache({ stdTTL: 30, checkperiod: 60 });
        console.log(chalk.green('🎮 Event Control System initialized'));
    }

    // 🎯 TOGGLE INDIVIDUAL FEATURES
    async toggleFeature(context, feature, enabled = null) {
        const { reply, args } = context;
        
        const validFeatures = {
            'antidelete': 'Anti-Delete',
            'autoview': 'Auto-View Status', 
            'autotyping': 'Auto-Typing',
            'autorecording': 'Auto-Recording',
            'autolike': 'Auto-Like Status',
            'antileft': 'Anti-Left'
        };

        // Show feature list if no feature specified
        if (!feature) {
            const featureStates = this.eventHandlers.getAllFeatureStates();
            const featureList = Object.entries(validFeatures)
                .map(([key, name]) => {
                    const status = featureStates[key] ? '✅' : '❌';
                    return `${status} ${name}`;
                })
                .join('\n');

            await reply(`🎮 *EVENT FEATURES*\n\n${featureList}\n\nUsage: .event <feature> on/off\nExample: .event antidelete on`);
            return;
        }

        // Validate feature
        if (!validFeatures[feature]) {
            await reply(`❌ Invalid feature. Available:\n${Object.keys(validFeatures).join(', ')}`);
            return;
        }

        // Toggle or set specific state
        const newState = enabled !== null ? enabled : !this.eventHandlers.getFeatureState(feature);
        const success = this.eventHandlers.toggleFeature(feature, newState);

        if (success) {
            await reply(`🔧 *${validFeatures[feature]}* ${newState ? 'ENABLED ✅' : 'DISABLED ❌'}`);
        } else {
            await reply('❌ Failed to toggle feature');
        }
    }

    // 🎯 TOGGLE ALL FEATURES
    async toggleAllFeatures(context, enabled) {
        const { reply } = context;
        
        this.eventHandlers.toggleAllFeatures(enabled);
        await reply(`🔧 *ALL FEATURES* ${enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    }

    // 📊 SHOW STATISTICS
    async showStats(context) {
        const { reply } = context;
        
        // Cache stats to prevent spam
        const cacheKey = `stats_${context.sender}`;
        const cachedStats = this.statsCache.get(cacheKey);
        
        if (cachedStats) {
            await reply(cachedStats);
            return;
        }

        const stats = this.eventHandlers.getStats();
        const featureStates = this.eventHandlers.getAllFeatureStates();
        
        const statsText = `
📊 *EVENT HANDLER STATS*

🎯 Feature States:
${Object.entries(featureStates).map(([feature, state]) => 
    `${state ? '✅' : '❌'} ${feature}`
).join('\n')}

📈 Activity (Last 5min):
• Anti-Delete: ${stats.antideleteTriggers}
• Auto-View: ${stats.autoviewTriggers} 
• Auto-Typing: ${stats.autotypingTriggers}
• Auto-Recording: ${stats.autorecordingTriggers}
• Errors: ${stats.errors}

💾 Cache Usage:
• Messages: ${stats.cacheSizes.deletedMessages}
• Sessions: ${stats.cacheSizes.typingSessions}

👥 Scale: Optimized for 880+ users
🕒 Last Reset: ${new Date().toLocaleTimeString()}

Use *.event <feature> on/off* to toggle
        `.trim();

        this.statsCache.set(cacheKey, statsText);
        await reply(statsText);
    }

    // 🧹 CLEANUP COMMAND
    async cleanup(context) {
        const { reply } = context;
        
        this.eventHandlers.cleanup();
        await reply('🧹 Event handlers cleaned up! Cache cleared and sessions reset.');
    }

    // 🔄 RESTART EVENTS
    async restartEvents(context) {
        const { reply } = context;
        
        this.eventHandlers.cleanup();
        this.eventHandlers.setupAllHandlers(this.eventHandlers.sock);
        await reply('🔄 Event handlers restarted successfully!');
    }
}

module.exports = EventControl;