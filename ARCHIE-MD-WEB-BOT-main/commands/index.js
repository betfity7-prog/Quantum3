const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const NodeCache = require('node-cache');

class CommandSystem {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.categories = ['owner', 'admin', 'ai', 'group', 'tools', 'fun', 'search', 'download'];
        this.stats = {
            loaded: 0,
            errors: 0,
            categories: {},
            executions: 0,
            failedExecutions: 0
        };
        
        this.commandCache = new NodeCache({ 
            stdTTL: 600, // 10 minutes cache
            checkperiod: 120,
            maxKeys: 1000
        });
        
        this.commandList = [];
        this.botMode = 'public';
        this.superOwner = '237695717815';
        
        // Performance tracking
        this.performanceStats = {
            avgExecutionTime: 0,
            totalExecutionTime: 0,
            slowCommands: new Map()
        };
        
        this.loadAllCommands();
        console.log(chalk.green(`✅ Command System Loaded: ${this.stats.loaded} commands, ${this.stats.errors} errors`));
    }

    loadAllCommands() {
        console.log(chalk.blue('🔄 Loading command system...'));
        
        const startTime = Date.now();
        let totalLoaded = 0;

        for (const category of this.categories) {
            const categoryPath = path.join(__dirname, category);
            
            if (!fs.existsSync(categoryPath)) {
                console.log(chalk.yellow(`⚠️  Category folder not found: ${category}`));
                this.stats.categories[category] = 0;
                continue;
            }

            const commandFiles = fs.readdirSync(categoryPath).filter(file => 
                file.endsWith('.js') && !file.startsWith('_') && !file.startsWith('.')
            );

            this.stats.categories[category] = commandFiles.length;
            console.log(chalk.cyan(`📁 ${category}: ${commandFiles.length} commands`));

            // Load commands in parallel for better performance
            const loadPromises = commandFiles.map(file => this.loadCommandFile(category, file));
            
            // Process in batches to avoid memory spikes
            this.processInBatches(loadPromises, 5).then(results => {
                totalLoaded += results.filter(r => r.success).length;
            });
        }

        const loadTime = Date.now() - startTime;
        console.log(chalk.green(`🎯 Commands loaded in ${loadTime}ms: ${this.stats.loaded} successful, ${this.stats.errors} failed`));
    }

    async processInBatches(promises, batchSize) {
        const results = [];
        for (let i = 0; i < promises.length; i += batchSize) {
            const batch = promises.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch);
            results.push(...batchResults);
        }
        return results;
    }

    loadCommandFile(category, file) {
        return new Promise((resolve) => {
            try {
                const commandPath = path.join(__dirname, category, file);
                
                // Cache check for hot reload
                const cacheKey = `cmd_${category}_${file}`;
                const cachedCommand = this.commandCache.get(cacheKey);
                
                if (cachedCommand) {
                    this.registerCommand(cachedCommand, category, file);
                    resolve({ success: true, file });
                    return;
                }

                // Clear require cache for development
                delete require.cache[require.resolve(commandPath)];
                
                const command = require(commandPath);
                
                if (!command.name) {
                    console.log(chalk.yellow(`⚠️  Command without name: ${file}`));
                    resolve({ success: false, file, error: 'No name' });
                    return;
                }

                // Validate required properties
                if (typeof command.execute !== 'function') {
                    console.log(chalk.red(`❌ Command ${command.name} has no execute function: ${file}`));
                    resolve({ success: false, file, error: 'No execute function' });
                    return;
                }

                // Cache the command
                this.commandCache.set(cacheKey, command);
                this.registerCommand(command, category, file);
                
                resolve({ success: true, file });

            } catch (error) {
                console.log(chalk.red(`❌ Failed to load ${file}: ${error.message}`));
                this.stats.errors++;
                resolve({ success: false, file, error: error.message });
            }
        });
    }

    registerCommand(command, category, file) {
        const commandName = command.name.toLowerCase();
        
        this.commands.set(commandName, { 
            ...command, 
            category,
            file: file,
            loadedAt: Date.now()
        });

        this.commandList.push({
            name: command.name,
            category: category,
            description: command.description || 'No description',
            permission: command.permission || 'all',
            usage: command.usage || `.${command.name}`,
            aliases: command.aliases || []
        });

        // Register aliases
        if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => {
                const aliasKey = alias.toLowerCase();
                this.commands.set(aliasKey, { 
                    ...command, 
                    category,
                    file: file,
                    isAlias: true 
                });
                this.aliases.set(aliasKey, commandName);
            });
        }

        this.stats.loaded++;
    }

    async handle(commandName, context) {
        const startTime = Date.now();
        this.stats.executions++;

        try {
            // Input validation
            if (!commandName || typeof commandName !== 'string') {
                await context.reply('❌ Invalid command name');
                return false;
            }

            const commandObj = this.commands.get(commandName.toLowerCase());
            
            if (!commandObj) {
                return false; // Command not found
            }

            // Permission check with caching
            const permissionKey = `perm_${commandName}_${context.sender}`;
            let permissionResult = this.commandCache.get(permissionKey);
            
            if (!permissionResult) {
                permissionResult = this.checkPermission(commandObj, context);
                this.commandCache.set(permissionKey, permissionResult, 60); // Cache for 1 minute
            }

            if (!permissionResult.allowed) {
                await context.reply(permissionResult.message);
                return true;
            }

            // Ensure required dependencies are available
            await this.prepareContext(context);

            // Execute command with timeout protection
            const executionPromise = commandObj.execute(context);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout')), 30000) // 30 second timeout
            );

            await Promise.race([executionPromise, timeoutPromise]);

            // Update performance stats
            const executionTime = Date.now() - startTime;
            this.updatePerformanceStats(commandName, executionTime);

            return true;

        } catch (error) {
            this.stats.failedExecutions++;
            const executionTime = Date.now() - startTime;
            
            console.error(chalk.red(`❌ Command ${commandName} error after ${executionTime}ms:`), error);

            try {
                if (error.message === 'Command timeout') {
                    await context.reply('⏰ Command timed out. Please try again.');
                } else {
                    await context.reply(`❌ Error: ${error.message}\n\nPlease try again later.`);
                }
            } catch (replyError) {
                console.error(chalk.red('💥 Reply also failed:'), replyError);
            }
            
            return true;
        }
    }

    checkPermission(command, context) {
        const permissionLevel = command.permission || 'all';
        const senderNumber = context.sender.split('@')[0];
        
        // Fast path for super owner
        if (senderNumber === this.superOwner) {
            return { allowed: true, level: 'owner' };
        }

        switch(permissionLevel) {
            case 'owner':
                return { 
                    allowed: false, 
                    message: '❌ This command is for bot owner only!' 
                };
            
            case 'admin':
                if (context.isGroup && context.isAdmins) {
                    return { allowed: true, level: 'admin' };
                }
                return { 
                    allowed: false, 
                    message: '❌ Admin only command! You need to be a group admin.' 
                };
            
            case 'group':
                if (!context.isGroup) {
                    return { 
                        allowed: false, 
                        message: '❌ This command only works in groups!' 
                    };
                }
                return { allowed: true, level: 'group' };
            
            case 'premium':
                const isPremium = context.userData?.premium || false;
                if (!isPremium && senderNumber !== this.superOwner) {
                    return { 
                        allowed: false, 
                        message: '❌ Premium only command! Contact owner for premium access.' 
                    };
                }
                return { allowed: true, level: 'premium' };
            
            case 'all':
                if (this.botMode === 'self' && senderNumber !== this.superOwner) {
                    return { 
                        allowed: false, 
                        message: '❌ Bot is in self mode. Only owner can use commands.' 
                    };
                }
                return { allowed: true, level: 'all' };
            
            default:
                return { allowed: true, level: 'default' };
        }
    }

    async prepareContext(context) {
        // Ensure axios is available
        if (!context.axios) {
            context.axios = require('axios');
        }
        
        // Ensure fetch is available (for compatibility)
        if (!context.fetch) {
            context.fetch = require('node-fetch');
        }
        
        // Ensure database is available
        if (!context.db) {
            context.db = global.db || { 
                users: {}, 
                groups: {}, 
                settings: {}, 
                chats: {} 
            };
        }
        
        // Ensure user data is available
        if (!context.userData) {
            context.userData = {
                name: context.pushname || "",
                premium: false,
                limit: 10,
                role: "user",
                usageCount: 0
            };
        }
    }

    updatePerformanceStats(commandName, executionTime) {
        this.performanceStats.totalExecutionTime += executionTime;
        this.performanceStats.avgExecutionTime = 
            this.performanceStats.totalExecutionTime / this.stats.executions;

        // Track slow commands (> 5 seconds)
        if (executionTime > 5000) {
            const currentCount = this.performanceStats.slowCommands.get(commandName) || 0;
            this.performanceStats.slowCommands.set(commandName, currentCount + 1);
        }
    }

    // 🚀 MODE MANAGEMENT
    setMode(mode) {
        if (mode === 'self' || mode === 'public') {
            this.botMode = mode;
            console.log(chalk.green(`🔧 Bot mode changed to: ${mode}`));
            
            // Clear permission cache when mode changes
            this.commandCache.keys().forEach(key => {
                if (key.startsWith('perm_')) {
                    this.commandCache.del(key);
                }
            });
            
            return true;
        }
        return false;
    }

    getMode() {
        return this.botMode;
    }

    // 🚀 COMMAND SEARCH & DISCOVERY
    searchCommands(query) {
        const searchTerm = query.toLowerCase();
        return this.commandList.filter(cmd => 
            cmd.name.toLowerCase().includes(searchTerm) ||
            cmd.description.toLowerCase().includes(searchTerm) ||
            cmd.category.toLowerCase().includes(searchTerm)
        );
    }

    getCommandsByCategory(category) {
        return this.commandList.filter(cmd => cmd.category === category);
    }

    getCommandInfo(commandName) {
        const command = this.commands.get(commandName.toLowerCase());
        if (!command) return null;

        return {
            name: command.name,
            category: command.category,
            description: command.description,
            permission: command.permission,
            usage: command.usage || `.${command.name}`,
            aliases: command.aliases || [],
            file: command.file,
            loadedAt: command.loadedAt
        };
    }

    // 🚀 RELOAD SYSTEM
    reloadCommand(category, fileName) {
        try {
            const commandPath = path.join(__dirname, category, fileName);
            
            // Clear cache
            delete require.cache[require.resolve(commandPath)];
            this.commandCache.del(`cmd_${category}_${fileName}`);
            
            // Reload command
            const command = require(commandPath);
            this.registerCommand(command, category, fileName);
            
            console.log(chalk.green(`🔄 Reloaded: ${category}/${fileName}`));
            return true;
        } catch (error) {
            console.log(chalk.red(`❌ Failed to reload ${category}/${fileName}:`), error);
            return false;
        }
    }

    reloadAllCommands() {
        console.log(chalk.blue('🔄 Reloading all commands...'));
        
        // Clear all caches
        this.commands.clear();
        this.aliases.clear();
        this.commandList = [];
        this.commandCache.flushAll();
        this.stats.loaded = 0;
        this.stats.errors = 0;
        
        // Reload
        this.loadAllCommands();
        
        console.log(chalk.green(`✅ Commands reloaded: ${this.stats.loaded} commands`));
    }

    // 🚀 STATISTICS & MONITORING
    getStats() {
        return {
            loaded: this.stats.loaded,
            errors: this.stats.errors,
            categories: this.stats.categories,
            executions: this.stats.executions,
            failedExecutions: this.stats.failedExecutions,
            mode: this.botMode,
            superOwner: this.superOwner,
            performance: {
                avgExecutionTime: Math.round(this.performanceStats.avgExecutionTime),
                totalExecutionTime: this.performanceStats.totalExecutionTime,
                slowCommands: Array.from(this.performanceStats.slowCommands.entries())
            },
            cache: {
                size: this.commandCache.keys().length,
                hits: this.commandCache.getStats().hits,
                misses: this.commandCache.getStats().misses
            }
        };
    }

    getHealth() {
        const stats = this.getStats();
        const health = {
            status: 'healthy',
            commandsLoaded: stats.loaded,
            errorRate: (stats.failedExecutions / Math.max(1, stats.executions)) * 100,
            avgResponseTime: stats.performance.avgExecutionTime,
            cacheEfficiency: (stats.cache.hits / Math.max(1, stats.cache.hits + stats.cache.misses)) * 100
        };

        if (health.errorRate > 10) health.status = 'degraded';
        if (health.errorRate > 25) health.status = 'unhealthy';
        if (stats.loaded === 0) health.status = 'critical';

        return health;
    }

    // 🚀 UTILITY METHODS
    isSuperOwner(sender) {
        const senderNumber = sender.split('@')[0];
        return senderNumber === this.superOwner;
    }

    getAllCommands() {
        return this.commandList;
    }

    getCommandCount() {
        return this.stats.loaded;
    }

    // 🚀 CLEANUP
    cleanup() {
        this.commandCache.flushAll();
        console.log(chalk.green('🧹 Command system cleaned up'));
    }

    // 🚀 BACKUP & RESTORE
    exportCommandData() {
        return {
            commands: this.commandList,
            stats: this.getStats(),
            timestamp: Date.now(),
            version: '2.0'
        };
    }
}

// Create singleton instance
const commandSystem = new CommandSystem();

// Auto-cleanup every hour
setInterval(() => {
    commandSystem.commandCache.keys().forEach(key => {
        // Remove old permission cache entries
        if (key.startsWith('perm_') && Math.random() < 0.1) { // Random 10% cleanup
            commandSystem.commandCache.del(key);
        }
    });
}, 60 * 60 * 1000);

// Handle process exit
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🔄 Cleaning up command system...'));
    commandSystem.cleanup();
});

module.exports = CommandSystem;