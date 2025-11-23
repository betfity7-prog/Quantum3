const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const chalk = require('chalk');
const readline = require('readline');

class TelegramSetup {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.configFile = path.join(__dirname, 'telegram-bot-config.json');
    }

    // Step-by-step setup guide
    async startSetup() {
        console.log(chalk.cyan('🎯 TELEGRAM BOT SETUP GUIDE'));
        console.log(chalk.yellow('='.repeat(50)));
        
        console.log(`
📋 FOLLOW THESE STEPS:

1. Open Telegram and search for "@BotFather"
2. Send "/newbot" to create a new bot
3. Choose a name for your bot (e.g., "MySessionStorageBot")
4. Choose a username (must end with "bot", e.g., "mysessions_storage_bot")
5. Copy the bot token provided by BotFather
6. Start your bot by clicking "/start"
7. Send any message to your bot
8. Get your chat ID (I'll show you how)
        `);

        await this.pressToContinue('Press Enter when ready to begin...');

        // Get bot token
        const token = await this.askQuestion('🤖 Enter your bot token from BotFather: ');
        
        // Verify token and get bot info
        const botInfo = await this.verifyBotToken(token);
        if (!botInfo) {
            console.log(chalk.red('❌ Invalid bot token. Please try again.'));
            this.rl.close();
            return false;
        }

        console.log(chalk.green(`✅ Bot verified: ${botInfo.first_name} (@${botInfo.username})`));

        // Get chat ID
        const chatId = await this.getChatId(token);
        if (!chatId) {
            console.log(chalk.red('❌ Could not get chat ID. Please make sure you sent a message to your bot.'));
            this.rl.close();
            return false;
        }

        // Save configuration
        const config = {
            token: token,
            chatId: chatId,
            botUsername: botInfo.username,
            configuredAt: new Date().toISOString()
        };

        fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
        
        console.log(chalk.green('🎉 TELEGRAM BOT CONFIGURED SUCCESSFULLY!'));
        console.log(chalk.blue(`📁 Config saved to: ${this.configFile}`));
        console.log(chalk.green(`🤖 Bot: ${botInfo.first_name} (@${botInfo.username})`));
        console.log(chalk.green(`💬 Chat ID: ${chatId}`));

        this.rl.close();
        return true;
    }

    // Verify bot token is valid
    async verifyBotToken(token) {
        try {
            const bot = new Telegraf(token);
            const botInfo = await bot.telegram.getMe();
            return botInfo;
        } catch (error) {
            console.log(chalk.red('❌ Invalid token:', error.message));
            return null;
        }
    }

    // Get chat ID by having user send a message
    async getChatId(token) {
        console.log(chalk.yellow('\n📝 GETTING YOUR CHAT ID:'));
        console.log('1. Go to your bot in Telegram:');
        console.log(chalk.blue(`   https://t.me/${(await this.verifyBotToken(token)).username}`));
        console.log('2. Click "START" or send any message');
        console.log('3. Wait for me to detect your message...');
        
        await this.pressToContinue('Press Enter after sending a message to your bot...');

        try {
            const bot = new Telegraf(token);
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    bot.stop('timeout');
                    reject(new Error('Timeout: No message received within 30 seconds'));
                }, 30000);

                bot.start((ctx) => {
                    clearTimeout(timeout);
                    const chatId = ctx.chat.id;
                    console.log(chalk.green(`✅ Chat ID detected: ${chatId}`));
                    bot.stop('success');
                    resolve(chatId);
                });

                bot.on('text', (ctx) => {
                    clearTimeout(timeout);
                    const chatId = ctx.chat.id;
                    console.log(chalk.green(`✅ Chat ID detected: ${chatId}`));
                    bot.stop('success');
                    resolve(chatId);
                });

                bot.launch().then(() => {
                    console.log(chalk.blue('🔍 Listening for your message...'));
                }).catch(reject);
            });

        } catch (error) {
            console.log(chalk.red('❌ Error getting chat ID:'), error.message);
            return null;
        }
    }

    // Helper methods
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    pressToContinue(message) {
        return new Promise((resolve) => {
            this.rl.question(message, resolve);
        });
    }

    // Check if already configured
    isConfigured() {
        return fs.existsSync(this.configFile);
    }

    // Show current configuration
    showConfig() {
        if (this.isConfigured()) {
            const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
            console.log(chalk.cyan('📋 CURRENT TELEGRAM CONFIG:'));
            console.log(chalk.blue(`🤖 Bot: @${config.botUsername}`));
            console.log(chalk.blue(`💬 Chat ID: ${config.chatId}`));
            console.log(chalk.blue(`⏰ Configured: ${new Date(config.configuredAt).toLocaleString()}`));
        } else {
            console.log(chalk.yellow('⚠️  Telegram bot not configured yet.'));
        }
    }
}

// Command line interface
if (require.main === module) {
    const setup = new TelegramSetup();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'setup':
            setup.startSetup();
            break;
        case 'status':
            setup.showConfig();
            break;
        case 'help':
        default:
            console.log(chalk.cyan('📋 TELEGRAM SETUP COMMANDS:'));
            console.log('npm run telegram-setup    - Setup Telegram bot');
            console.log('npm run telegram-status   - Show current config');
            console.log('npm run telegram-help     - Show this help');
            break;
    }
}

module.exports = TelegramSetup;