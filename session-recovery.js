// session-recovery.js - COMPLETE BAD MAC FIX
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const NodeCache = require('node-cache');

class SessionRecovery {
    constructor() {
        this.recoveryLog = path.join(__dirname, 'session-recovery-log.json');
        this.recoveryCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
        this.maxRecoveryAttempts = 3;
        this.recoveryCooldown = 2 * 60 * 1000; // 2 minutes
        this.stats = {
            totalRecoveries: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            badMacErrors: 0,
            sessionResyncs: 0,
            autoRecoveries: 0
        };
        
        this.loadRecoveryLog();
        console.log(chalk.green('🔄 Session Recovery System - BAD MAC FIX Active'));
    }

    // Handle Bad MAC errors automatically
    async handleBadMacError(sessionId, phoneNumber, botInstance, error) {
        this.stats.badMacErrors++;
        this.stats.totalRecoveries++;

        console.log(chalk.yellow(`🔄 BAD MAC Recovery: ${sessionId}`));
        console.log(chalk.yellow(`   📱 ${phoneNumber} | ${error.message}`));

        // Check recovery limits
        if (this.hasExceededRecoveryLimit(sessionId)) {
            console.log(chalk.red(`   ⏰ Recovery limit exceeded for ${sessionId}`));
            return { success: false, action: 'cooldown' };
        }

        this.trackRecoveryAttempt(sessionId);

        try {
            // Step 1: Quick refresh
            console.log(chalk.blue('   🔄 Quick refresh...'));
            if (await this.quickRefresh(botInstance)) {
                console.log(chalk.green('   ✅ Quick refresh successful'));
                this.stats.successfulRecoveries++;
                return { success: true, action: 'quick_refresh' };
            }

            // Step 2: Session resync
            console.log(chalk.blue('   🔄 Session resynchronization...'));
            if (await this.forceSessionResync(sessionId, phoneNumber, botInstance)) {
                console.log(chalk.green('   ✅ Session resync successful'));
                this.stats.successfulRecoveries++;
                this.stats.sessionResyncs++;
                return { success: true, action: 'resync' };
            }

            // Step 3: Full reauthentication needed
            console.log(chalk.red('   ❌ Full reauthentication required'));
            this.stats.failedRecoveries++;
            return this.recommendReauthentication(sessionId, phoneNumber);

        } catch (recoveryError) {
            console.error(chalk.red(`   ❌ Recovery failed: ${recoveryError.message}`));
            this.stats.failedRecoveries++;
            return { success: false, action: 'error', error: recoveryError.message };
        } finally {
            this.saveRecoveryLog();
        }
    }

    async quickRefresh(botInstance) {
        try {
            if (botInstance?.refreshMediaConnections) {
                await botInstance.refreshMediaConnections(true);
                
                // Clear message cache
                if (botInstance.clearCache) {
                    await botInstance.clearCache();
                }
                
                // Small delay for stabilization
                await new Promise(resolve => setTimeout(resolve, 1000));
                return true;
            }
            return false;
        } catch (error) {
            console.log(chalk.yellow(`   ⚠️  Quick refresh failed: ${error.message}`));
            return false;
        }
    }

    async forceSessionResync(sessionId, phoneNumber, botInstance) {
        try {
            if (botInstance?.requestPairingCode) {
                console.log(chalk.blue(`   📱 Requesting new pairing code...`));
                
                const pairingCode = await botInstance.requestPairingCode(phoneNumber);
                
                if (pairingCode) {
                    console.log(chalk.green(`   🔐 New pairing code: ${pairingCode}`));
                    
                    // Update session tracker
                    try {
                        const sessionTracker = require('./session-tracker');
                        sessionTracker.updateSessionStatus(sessionId, 'resyncing', {
                            lastResync: Date.now(),
                            resyncCount: (sessionTracker.getSession(sessionId)?.resyncCount || 0) + 1,
                            pairingCode: pairingCode
                        });
                    } catch (trackerError) {
                        // Ignore tracker errors
                    }
                    
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.log(chalk.yellow(`   ⚠️  Session resync failed: ${error.message}`));
            return false;
        }
    }

    recommendReauthentication(sessionId, phoneNumber) {
        console.log(chalk.red(`🚨 REAUTHENTICATION REQUIRED: ${sessionId}`));
        
        // Mark session for cleanup
        if (!global.markedForDeletion) {
            global.markedForDeletion = new Set();
        }
        global.markedForDeletion.add(sessionId);

        // Update session tracker
        try {
            const sessionTracker = require('./session-tracker');
            sessionTracker.updateSessionStatus(sessionId, 'needs_reauthentication', {
                reauthRequiredAt: Date.now(),
                recoveryAttempts: this.recoveryAttempts[sessionId]?.count || 0
            });
        } catch (trackerError) {
            // Ignore tracker errors
        }

        return {
            action: 'reauthentication_required',
            sessionId,
            phoneNumber,
            message: 'Delete session and re-scan QR code'
        };
    }

    // Recovery tracking
    trackRecoveryAttempt(sessionId) {
        if (!this.recoveryAttempts[sessionId]) {
            this.recoveryAttempts[sessionId] = {
                count: 0,
                firstAttempt: Date.now(),
                lastAttempt: Date.now(),
                successes: 0,
                failures: 0
            };
        }

        this.recoveryAttempts[sessionId].count++;
        this.recoveryAttempts[sessionId].lastAttempt = Date.now();
    }

    hasExceededRecoveryLimit(sessionId) {
        const attempts = this.recoveryAttempts[sessionId];
        if (!attempts) return false;

        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        const tooManyAttempts = attempts.count >= this.maxRecoveryAttempts;
        const inCooldown = timeSinceLastAttempt < this.recoveryCooldown;

        return tooManyAttempts && inCooldown;
    }

    // Auto-recovery for message processing
    async autoRecoverMessage(sessionId, error, msg, sock) {
        if (error.message.includes('Bad MAC') || error.message.includes('Failed to decrypt')) {
            console.log(chalk.yellow(`🔄 Auto-recovering Bad MAC error for ${sessionId}`));
            
            try {
                const botInstance = sock;
                const phoneNumber = sessionId.split('_')[1] || 'unknown';
                
                const result = await this.handleBadMacError(sessionId, phoneNumber, botInstance, error);
                
                if (result.success) {
                    this.stats.autoRecoveries++;
                    console.log(chalk.green(`✅ Auto-recovery successful for ${sessionId}`));
                    
                    // Retry the message
                    if (msg && msg.reply) {
                        await msg.reply('🔄 Session recovered! Message reprocessed.');
                    }
                    
                    return true;
                }
            } catch (recoveryError) {
                console.error(chalk.red(`❌ Auto-recovery failed: ${recoveryError.message}`));
            }
        }
        
        return false;
    }

    loadRecoveryLog() {
        try {
            if (fs.existsSync(this.recoveryLog)) {
                const data = JSON.parse(fs.readFileSync(this.recoveryLog, 'utf8'));
                this.recoveryAttempts = data.recoveryAttempts || {};
                this.stats = { ...this.stats, ...data.stats };
            } else {
                this.recoveryAttempts = {};
            }
        } catch (error) {
            console.error(chalk.red('❌ Error loading recovery log:'), error.message);
            this.recoveryAttempts = {};
        }
    }

    saveRecoveryLog() {
        try {
            const data = {
                recoveryAttempts: this.recoveryAttempts,
                stats: this.stats,
                lastUpdate: Date.now()
            };
            fs.writeFileSync(this.recoveryLog, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(chalk.red('❌ Error saving recovery log:'), error.message);
        }
    }

    getRecoveryStats() {
        return {
            ...this.stats,
            activeRecoveryAttempts: Object.keys(this.recoveryAttempts).length,
            recoveryEfficiency: this.stats.successfulRecoveries / Math.max(1, this.stats.totalRecoveries) * 100
        };
    }
}

// Create and export instance
const sessionRecovery = new SessionRecovery();
module.exports = sessionRecovery;