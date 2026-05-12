const fs = require('fs');
const path = require('path');

class TelegramConfig {
    constructor() {
        this.configFile = path.join(__dirname, 'telegram-bot-config.json');
        this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
                this.token = config.token;
                this.chatId = config.chatId;
                this.botUsername = config.botUsername;
            } else {
                this.token = null;
                this.chatId = null;
                this.botUsername = null;
            }
        } catch (error) {
            console.error('❌ Error loading Telegram config:', error);
            this.token = null;
            this.chatId = null;
            this.botUsername = null;
        }
    }

    saveConfig(token, chatId, botUsername) {
        try {
            const config = {
                token,
                chatId,
                botUsername,
                configuredAt: new Date().toISOString()
            };
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
            this.token = token;
            this.chatId = chatId;
            this.botUsername = botUsername;
            console.log('✅ Telegram configuration saved successfully!');
            return true;
        } catch (error) {
            console.error('❌ Error saving Telegram config:', error);
            return false;
        }
    }

    isConfigured() {
        return !!(this.token && this.chatId);
    }

    getConfig() {
        return {
            token: this.token,
            chatId: this.chatId,
            botUsername: this.botUsername,
            isConfigured: this.isConfigured()
        };
    }
}

module.exports = new TelegramConfig();