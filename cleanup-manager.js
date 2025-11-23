const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class CleanupManager {
    constructor() {
        this.cleanupIntervals = new Map();
        this.isRunning = false;
        this.stats = {
            sessionsCleaned: 0,
            memoryFreed: 0,
            filesDeleted: 0,
            errors: 0,
            lastRun: null,
            totalRuns: 0,
            preventedDeletions: 0
        };
        
        // 🚨 ULTRA-CONSERVATIVE SETTINGS
        this.config = {
            sessionCleanupInterval: 30 * 60 * 1000, // 30 minutes
            maxSessionAge: 90 * 24 * 60 * 60 * 1000, // 90 days
            maxInactiveTime: 7 * 24 * 60 * 60 * 1000, // 7 DAYS
            orphanedSessionTimeout: 48 * 60 * 60 * 1000, // 48 hours
            
            memoryCheckInterval: 2 * 60 * 1000, // 2 minutes
            memoryThreshold: 1024 * 1024 * 1024, // 1GB
            criticalMemoryThreshold: 1536 * 1024 * 1024, // 1.5GB
            
            tempFileCleanupInterval: 60 * 60 * 1000, // 60 minutes
            maxTempFileAge: 6 * 60 * 60 * 1000, // 6 hours
        };
        
        console.log(chalk.green('🚀 ULTRA-SAFE CleanupManager initialized'));
    }

    // 🆕 ULTRA-SAFE: Session cleanup with maximum protection
    async safeCleanupSessions() {
        try {
            this.stats.totalRuns++;
            this.stats.lastRun = Date.now();
            
            const sessionsDir = path.join(__dirname, 'sessions');
            if (!fs.existsSync(sessionsDir)) {
                return { cleaned: 0, errors: 0, prevented: 0 };
            }

            const sessionFolders = fs.readdirSync(sessionsDir);
            let cleanedCount = 0;
            let errorCount = 0;
            let preventedCount = 0;

            console.log(chalk.blue(`🛡️  ULTRA-SAFE session check: ${sessionFolders.length} sessions...`));

            // Use session tracker for accurate active/inactive status
            const sessionTracker = require('./session-tracker');
            const activeSessions = sessionTracker.getActiveSessions();
            const activeSessionIds = new Set(activeSessions.map(s => s.sessionId));

            for (const sessionId of sessionFolders) {
                try {
                    const sessionPath = path.join(sessionsDir, sessionId);
                    
                    // 🚨 CRITICAL: NEVER touch active sessions
                    if (activeSessionIds.has(sessionId)) {
                        console.log(chalk.green(`   ✅ Protecting ACTIVE session: ${sessionId}`));
                        preventedCount++;
                        continue;
                    }
                    
                    const stats = fs.statSync(sessionPath);
                    const sessionAge = Date.now() - stats.birthtimeMs;
                    
                    // 🚨 ONLY clean up very old sessions
                    const shouldCleanup = sessionAge > this.config.maxSessionAge;

                    if (shouldCleanup) {
                        await this.cleanupSession(sessionId, sessionPath);
                        cleanedCount++;
                    }
                } catch (error) {
                    console.error(chalk.red(`❌ Error checking session ${sessionId}:`), error.message);
                    errorCount++;
                }
            }

            this.stats.sessionsCleaned += cleanedCount;
            this.stats.errors += errorCount;
            this.stats.preventedDeletions += preventedCount;

            if (cleanedCount > 0 || preventedCount > 0) {
                console.log(chalk.green(`🎯 Ultra-safe cleanup: ${cleanedCount} cleaned, ${preventedCount} protected`));
            } else {
                console.log(chalk.gray('   ℹ️  No sessions needed cleaning'));
            }

            return { cleaned: cleanedCount, errors: errorCount, prevented: preventedCount };

        } catch (error) {
            console.error(chalk.red('❌ Session cleanup error:'), error);
            this.stats.errors++;
            return { cleaned: 0, errors: 1, prevented: 0 };
        }
    }

    // 🆕 SAFE: Emergency memory cleanup - MAXIMUM PROTECTION
    safeEmergencyMemoryCleanup() {
        try {
            console.log(chalk.red('🔥 SAFE EMERGENCY MEMORY CLEANUP - MAXIMUM PROTECTION'));
            
            const sessionsDir = path.join(__dirname, 'sessions');
            if (!fs.existsSync(sessionsDir)) return;
            
            const sessionFolders = fs.readdirSync(sessionsDir);
            
            // Get active sessions first to protect them
            const sessionTracker = require('./session-tracker');
            const activeSessions = sessionTracker.getActiveSessions();
            const activeSessionIds = new Set(activeSessions.map(s => s.sessionId));
            
            // Only consider sessions that are NOT active
            const inactiveSessions = sessionFolders
                .filter(sessionId => !activeSessionIds.has(sessionId))
                .map(sessionId => {
                    try {
                        const sessionPath = path.join(sessionsDir, sessionId);
                        const stats = fs.statSync(sessionPath);
                        return { sessionId, birthtime: stats.birthtimeMs, size: this.getFolderSize(sessionPath) };
                    } catch (error) {
                        return { sessionId, birthtime: 0, size: 0 };
                    }
                })
                .sort((a, b) => a.birthtime - b.birthtime);
            
            // Remove only oldest 10% of INACTIVE sessions (very conservative)
            const toRemove = Math.max(3, Math.floor(inactiveSessions.length * 0.1));
            let removedCount = 0;
            
            console.log(chalk.yellow(`   📊 Emergency cleanup: ${inactiveSessions.length} inactive sessions, removing ${toRemove} oldest`));
            
            for (let i = 0; i < toRemove && i < inactiveSessions.length; i++) {
                try {
                    const { sessionId } = inactiveSessions[i];
                    const sessionPath = path.join(sessionsDir, sessionId);
                    this.cleanupSession(sessionId, sessionPath);
                    removedCount++;
                } catch (error) {
                    console.error(chalk.red(`   ❌ Emergency cleanup failed for: ${inactiveSessions[i].sessionId}`));
                }
            }
            
            console.log(chalk.green(`🎯 Safe emergency cleanup: ${removedCount} INACTIVE sessions removed, ${activeSessions.length} active sessions protected`));
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                console.log(chalk.blue('     🧹 Manual garbage collection triggered'));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Emergency cleanup error:'), error);
        }
    }

    async cleanupSession(sessionId, sessionPath) {
        try {
            // Remove session files
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                this.stats.filesDeleted++;
                console.log(chalk.yellow(`   🗑️  Cleaned session: ${sessionId}`));
            }
            
            // Remove from session tracker
            try {
                const sessionTracker = require('./session-tracker');
                sessionTracker.removeSession(sessionId);
            } catch (trackerError) {
                // Ignore tracker errors
            }
            
            return true;
        } catch (error) {
            console.error(chalk.red(`   ❌ Error cleaning session ${sessionId}:`), error.message);
            return false;
        }
    }

    getFolderSize(path) {
        try {
            const stats = fs.statSync(path);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    // 🆕 Health check for cleanup system
    getHealthStatus() {
        return {
            isRunning: this.isRunning,
            stats: this.stats,
            config: this.config,
            memoryUsage: process.memoryUsage(),
            sessionHealth: this.getSessionHealthSummary()
        };
    }

    // 🆕 Get session health summary
    getSessionHealthSummary() {
        try {
            const sessionTracker = require('./session-tracker');
            const stats = sessionTracker.getStats();
            
            return {
                total: stats.total,
                active: stats.active,
                inactive: stats.inactive,
                protected: stats.protected,
                connected: stats.connected,
                preventedDeletions: this.stats.preventedDeletions
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    // 🆕 Start safe cleanup interval
    startSafeCleanup() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        setInterval(() => {
            this.safeCleanupSessions();
        }, this.config.sessionCleanupInterval);
        
        console.log(chalk.green('✅ Safe cleanup system started'));
    }

    // 🆕 Stop cleanup
    stopCleanup() {
        this.isRunning = false;
        console.log(chalk.yellow('🛑 Cleanup system stopped'));
    }
}

// Create and export safe instance
const cleanupManager = new CleanupManager();

// Auto-start safe cleanup
setTimeout(() => {
    cleanupManager.startSafeCleanup();
}, 10000); // Start after 10 seconds

module.exports = cleanupManager;