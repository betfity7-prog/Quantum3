const { Telegraf } = require('telegraf');
const TelegramBot = require('node-telegram-bot-api');
const chalk = require('chalk');
const telegramConfig = require('./telegram-config');
const sessionEncoder = require('./session-encoder');

class TelegramStorage {
    constructor() {
        this.bot = null;
        this.telegraf = null;
        this.isConnected = false;
        this.messageQueue = [];
        this.processingQueue = false;
    }

    // Initialize Telegram bot connection
    async initialize() {
        try {
            if (!telegramConfig.isConfigured()) {
                console.log(chalk.yellow('⚠️  Telegram bot not configured. Storage disabled.'));
                return false;
            }

            console.log(chalk.blue('🤖 Initializing Telegram storage...'));

            // Initialize both clients for different purposes
            this.bot = new TelegramBot(telegramConfig.token, { polling: false });
            this.telegraf = new Telegraf(telegramConfig.token);

            // Test connection
            await this.bot.getMe();
            this.isConnected = true;

            console.log(chalk.green('✅ Telegram storage initialized successfully!'));
            return true;

        } catch (error) {
            console.error(chalk.red('❌ Telegram storage initialization failed:'), error.message);
            this.isConnected = false;
            return false;
        }
    }

    // Store session in Telegram messages
    async storeSession(sessionId, sessionDir) {
        try {
            if (!this.isConnected) {
                throw new Error('Telegram storage not connected');
            }

            console.log(chalk.blue(`💾 Storing session to Telegram: ${sessionId}`));

            // Encode session to Base64
            const sessionData = await sessionEncoder.encodeSession(sessionDir);
            const chunks = sessionEncoder.splitIntoChunks(sessionData);

            // Create metadata message
            const metadata = {
                type: 'session_backup',
                sessionId: sessionId,
                chunkCount: chunks.length,
                timestamp: Date.now(),
                totalSize: sessionData.length
            };

            // Send metadata first
            await this.sendMessage(`SESSION_METADATA:${JSON.stringify(metadata)}`);

            // Send chunks with sequence numbers
            for (let i = 0; i < chunks.length; i++) {
                const chunkMessage = `SESSION_CHUNK:${sessionId}:${i}:${chunks[i]}`;
                await this.sendMessage(chunkMessage);
                
                // Rate limiting to avoid Telegram limits
                if (i % 5 === 0) {
                    await this.delay(1000);
                }
            }

            console.log(chalk.green(`✅ Session stored in Telegram: ${sessionId} (${chunks.length} chunks)`));
            return true;

        } catch (error) {
            console.error(chalk.red(`❌ Error storing session ${sessionId}:`), error);
            throw error;
        }
    }

    // Restore session from Telegram messages
    async restoreSession(sessionId, targetDir) {
        try {
            if (!this.isConnected) {
                throw new Error('Telegram storage not connected');
            }

            console.log(chalk.blue(`🔄 Restoring session from Telegram: ${sessionId}`));

            // Get recent messages (simplified - we'll store locally)
            const messages = await this.getStoredMessages();
            
            // Find metadata and chunks
            const metadataMsg = messages.find(msg => 
                msg.text?.startsWith('SESSION_METADATA:') && 
                JSON.parse(msg.text.replace('SESSION_METADATA:', '')).sessionId === sessionId
            );

            if (!metadataMsg) {
                throw new Error(`No backup found for session: ${sessionId}`);
            }

            const metadata = JSON.parse(metadataMsg.text.replace('SESSION_METADATA:', ''));
            const chunkMessages = messages
                .filter(msg => msg.text?.startsWith(`SESSION_CHUNK:${sessionId}:`))
                .sort((a, b) => {
                    const aIndex = parseInt(a.text.split(':')[2]);
                    const bIndex = parseInt(b.text.split(':')[2]);
                    return aIndex - bIndex;
                });

            // Verify we have all chunks
            if (chunkMessages.length !== metadata.chunkCount) {
                console.log(chalk.yellow(`⚠️  Missing chunks: ${chunkMessages.length}/${metadata.chunkCount}`));
            }

            // Combine chunks
            const chunkData = chunkMessages.map(msg => {
                const parts = msg.text.split(':');
                return parts.slice(3).join(':'); // Get the actual data
            });

            const combinedData = sessionEncoder.combineChunks(chunkData);

            // Decode and restore session
            await sessionEncoder.decodeSession(combinedData, targetDir);

            console.log(chalk.green(`✅ Session restored from Telegram: ${sessionId}`));
            return true;

        } catch (error) {
            console.error(chalk.red(`❌ Error restoring session ${sessionId}:`), error);
            throw error;
        }
    }

    // Get all stored sessions metadata
    async getStoredSessions() {
        try {
            if (!this.isConnected) return [];

            const messages = await this.getStoredMessages();
            const metadataMessages = messages.filter(msg => 
                msg.text?.startsWith('SESSION_METADATA:')
            );

            const sessions = metadataMessages.map(msg => {
                try {
                    const metadata = JSON.parse(msg.text.replace('SESSION_METADATA:', ''));
                    return {
                        sessionId: metadata.sessionId,
                        timestamp: metadata.timestamp,
                        chunkCount: metadata.chunkCount,
                        totalSize: metadata.totalSize,
                        date: new Date(metadata.timestamp).toLocaleString()
                    };
                } catch (error) {
                    return null;
                }
            }).filter(session => session !== null);

            return sessions;

        } catch (error) {
            console.error(chalk.red('❌ Error getting stored sessions:'), error);
            return [];
        }
    }

    // Delete session backup from Telegram
    async deleteSessionBackup(sessionId) {
        try {
            if (!this.isConnected) return false;

            const messages = await this.getStoredMessages();
            const sessionMessages = messages.filter(msg => 
                msg.text?.includes(sessionId)
            );

            for (const msg of sessionMessages) {
                await this.deleteMessage(msg.message_id);
                await this.delay(500); // Rate limiting
            }

            console.log(chalk.green(`✅ Deleted session backup: ${sessionId}`));
            return true;

        } catch (error) {
            console.error(chalk.red(`❌ Error deleting session backup ${sessionId}:`), error);
            return false;
        }
    }

    // Simplified message storage (we'll store message IDs locally)
    async getStoredMessages() {
        try {
            // For now, return empty array - we'll implement proper storage
            // In production, we'd cache message IDs from Telegram
            return [];
        } catch (error) {
            return [];
        }
    }

    // Helper methods
    async sendMessage(text) {
        try {
            return await this.bot.sendMessage(telegramConfig.chatId, text);
        } catch (error) {
            if (error.response?.error_code === 429) {
                // Rate limited - wait and retry
                const retryAfter = error.response.parameters?.retry_after || 5;
                console.log(chalk.yellow(`⚠️  Rate limited, waiting ${retryAfter} seconds...`));
                await this.delay(retryAfter * 1000);
                return this.sendMessage(text);
            }
            throw error;
        }
    }

    async deleteMessage(messageId) {
        try {
            await this.bot.deleteMessage(telegramConfig.chatId, messageId);
        } catch (error) {
            console.error(chalk.red('❌ Error deleting message:'), error);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Health check
    async healthCheck() {
        try {
            if (!this.isConnected) return false;
            await this.bot.getMe();
            return true;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }
}

module.exports = new TelegramStorage();