const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class CommandSystem {
    constructor() {
        this.commands = new Map();
        this.categories = ['owner', 'admin', 'ai', 'group', 'tools'];
        this.stats = {
            loaded: 0,
            errors: 0,
            categories: {}
        };
        this.commandList = [];
        this.botMode = 'public';
        this.superOwner = '237695717815'; // Your bot number
        this.loadAllCommands();
    }

    loadAllCommands() {
        console.log(chalk.blue('🔄 Loading command system...'));
        
        for (const category of this.categories) {
            const categoryPath = path.join(__dirname, category);
            
            if (!fs.existsSync(categoryPath)) {
                console.log(chalk.yellow(`⚠️  Category folder not found: ${category}`));
                continue;
            }

            const commandFiles = fs.readdirSync(categoryPath).filter(file => 
                file.endsWith('.js') && !file.startsWith('_')
            );

            this.stats.categories[category] = commandFiles.length;
            console.log(chalk.cyan(`📁 ${category}: ${commandFiles.length} commands`));

            for (const file of commandFiles) {
                try {
                    const commandPath = path.join(categoryPath, file);
                    const command = require(commandPath);
                    
                    if (!command.name) {
                        console.log(chalk.yellow(`⚠️  Command without name: ${file}`));
                        continue;
                    }

                    this.commands.set(command.name, { 
                        ...command, 
                        category,
                        file: file
                    });

                    this.commandList.push({
                        name: command.name,
                        category: category,
                        description: command.description || 'No description',
                        permission: command.permission || 'all'
                    });

                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => {
                            this.commands.set(alias, { 
                                ...command, 
                                category,
                                file: file,
                                isAlias: true 
                            });
                        });
                    }

                    this.stats.loaded++;
                    
                } catch (error) {
                    console.log(chalk.red(`❌ Failed to load ${file}: ${error.message}`));
                    this.stats.errors++;
                }
            }
        }

        console.log(chalk.green(`✅ Command system loaded: ${this.stats.loaded} commands, ${this.stats.errors} errors`));
    }

    async handle(commandName, context) {
        const commandObj = this.commands.get(commandName.toLowerCase());
        
        if (!commandObj) {
            return false;
        }

        try {
            // 🚨 SIMPLIFIED PERMISSION CHECK - NO MORE CONFUSION
            const permissionResult = this.checkPermission(commandObj, context);
            
            if (!permissionResult.allowed) {
                await context.reply(permissionResult.message);
                return true;
            }

            // Execute command
            await commandObj.execute(context);
            return true;

        } catch (error) {
            console.error(chalk.red(`❌ Command ${commandName} error:`), error);
            
            try {
                await context.reply(`❌ Error executing command: ${error.message}`);
            } catch (replyError) {
                console.error(chalk.red('💥 Reply also failed:'), replyError);
            }
            
            return true;
        }
    }

    checkPermission(command, context) {
        const permissionLevel = command.permission || 'all';
        const senderNumber = context.sender.split('@')[0];
        
        console.log(chalk.yellow(`🔐 Permission check: ${command.name} | User: ${senderNumber} | Required: ${permissionLevel}`));

        // 🚨 ULTRA-SIMPLE PERMISSION SYSTEM
        switch(permissionLevel) {
            case 'owner':
                // Only super owner can use owner commands
                if (senderNumber === this.superOwner) {
                    return { allowed: true };
                }
                return { allowed: false, message: '❌ Owner only command!' };
            
            case 'admin':
                // Super owner OR group admins can use admin commands
                if (senderNumber === this.superOwner) {
                    return { allowed: true };
                }
                if (context.isGroup && context.isAdmins) {
                    return { allowed: true };
                }
                return { allowed: false, message: '❌ Admin only command!' };
            
            case 'group':
                // Only works in groups
                if (!context.isGroup) {
                    return { allowed: false, message: '❌ This command only works in groups!' };
                }
                return { allowed: true };
            
            case 'all':
                // Everyone can use, but check bot mode
                if (this.botMode === 'self' && senderNumber !== this.superOwner) {
                    return { allowed: false, message: '❌ Bot is in self mode. Only owner can use commands.' };
                }
                return { allowed: true };
            
            default:
                return { allowed: true };
        }
    }

    // 🆕 SIMPLE MODE MANAGEMENT
    setMode(mode) {
        if (mode === 'self' || mode === 'public') {
            this.botMode = mode;
            console.log(chalk.green(`🔧 Bot mode changed to: ${mode}`));
            return true;
        }
        return false;
    }

    getMode() {
        return this.botMode;
    }

    getStats() {
        return {
            loaded: this.stats.loaded,
            errors: this.stats.errors,
            categories: this.stats.categories,
            mode: this.botMode,
            superOwner: this.superOwner
        };
    }

    // 🆕 Check if user is super owner
    isSuperOwner(sender) {
        const senderNumber = sender.split('@')[0];
        return senderNumber === this.superOwner;
    }
}

module.exports = CommandSystem;