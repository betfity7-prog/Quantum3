const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const telegramStorage = require('./telegram-storage');
const sessionEncoder = require('./session-encoder');
const telegramConfig = require('./telegram-config');

class BackupManager {
    constructor() {
        this.sessionsDir = path.join(__dirname, 'sessions');
        this.backupInterval = 30 * 60 * 1000; // 30 minutes
        this.autoBackupEnabled = true;
        this.initialized = false;
        this.lastBackupTimes = new Map();
        this.minBackupInterval = 5 * 60 * 1000; // Minimum 5 minutes between backups
        this.backupIntervalId = null;
        this.isProcessing = false;
        
        // 🚨 CRITICAL FIX: Prevent cleanup during backup
        this.preventCleanupDuringBackup = true;
        
        this.stats = {
            totalBackups: 0,
            successfulBackups: 0,
            failedBackups: 0,
            lastBackup: null,
            totalSize: 0,
            preventedCleanups: 0 // NEW: Track prevented cleanups
        };
    }

    // Initialize backup system with proper error handling
    async initialize() {
        try {
            console.log(chalk.blue('🔄 Initializing backup system...'));
            
            // Ensure sessions directory exists
            if (!fs.existsSync(this.sessionsDir)) {
                fs.mkdirSync(this.sessionsDir, { recursive: true });
                console.log(chalk.green('✅ Created sessions directory'));
            }

            // Check if Telegram is configured
            if (!telegramConfig.isConfigured()) {
                console.log(chalk.yellow('⚠️  Telegram not configured. Backup system running in local-only mode.'));
                this.initialized = true;
                
                if (this.autoBackupEnabled) {
                    this.startAutoBackup();
                }
                return true;
            }

            // Initialize Telegram storage
            console.log(chalk.blue('📡 Connecting to Telegram storage...'));
            const telegramReady = await telegramStorage.initialize();
            
            if (telegramReady) {
                console.log(chalk.green('✅ Backup manager initialized with Telegram storage'));
                this.initialized = true;
                
                // Start auto-backup if enabled
                if (this.autoBackupEnabled) {
                    this.startAutoBackup();
                }
                
            } else {
                console.log(chalk.yellow('⚠️  Telegram storage failed, running in local mode'));
                this.initialized = true;
                
                if (this.autoBackupEnabled) {
                    this.startAutoBackup();
                }
            }

            return this.initialized;

        } catch (error) {
            console.error(chalk.red('❌ Backup manager initialization failed:'), error.message);
            this.initialized = false;
            return false;
        }
    }

    // 🚨 CRITICAL FIX: Enhanced backupSession with active session protection
    async backupSession(sessionId) {
        // Prevent multiple simultaneous backups
        if (this.isProcessing) {
            console.log(chalk.yellow('⏳ Backup already in progress, skipping...'));
            return false;
        }

        this.isProcessing = true;

        try {
            if (!this.initialized) {
                throw new Error('Backup manager not initialized');
            }

            // 🆕 CRITICAL: Check if session is active before backup
            const sessionTracker = require('./session-tracker');
            const isSessionActive = sessionTracker.isSessionActive(sessionId);
            
            if (!isSessionActive) {
                console.log(chalk.yellow(`⚠️  Skipping backup for INACTIVE session: ${sessionId}`));
                this.isProcessing = false;
                return false;
            }

            // Rate limiting: Check if we backed up recently
            const now = Date.now();
            const lastBackup = this.lastBackupTimes.get(sessionId);
            if (lastBackup && (now - lastBackup) < this.minBackupInterval) {
                console.log(chalk.yellow(`⏰ Skipping backup for ${sessionId} - backed up ${Math.round((now - lastBackup) / 60000)}min ago`));
                this.isProcessing = false;
                return true;
            }

            const sessionDir = path.join(this.sessionsDir, sessionId);
            
            // Validate session directory exists and has files
            if (!fs.existsSync(sessionDir)) {
                throw new Error(`Session directory not found: ${sessionId}`);
            }

            if (!this.isValidSession(sessionDir)) {
                throw new Error(`Invalid session directory: ${sessionId}`);
            }

            console.log(chalk.blue(`💾 Starting backup for: ${sessionId}`));
            
            // 🆕 CRITICAL: Set backup flag to prevent cleanup
            this.setBackupInProgress(sessionId, true);
            
            let backupResult;
            if (telegramConfig.isConfigured()) {
                backupResult = await telegramStorage.storeSession(sessionId, sessionDir);
            } else {
                // Local backup fallback
                backupResult = await this.createLocalBackup(sessionId, sessionDir);
            }

            if (backupResult) {
                // Update last backup time
                this.lastBackupTimes.set(sessionId, now);
                
                // Update statistics
                this.stats.totalBackups++;
                this.stats.successfulBackups++;
                this.stats.lastBackup = now;
                
                // Update session tracker if available
                try {
                    const sessionTracker = require('./session-tracker');
                    if (sessionTracker && sessionTracker.markBackedUp) {
                        sessionTracker.markBackedUp(sessionId);
                    }
                    console.log(chalk.green(`✅ Backup completed: ${sessionId}`));
                } catch (trackerError) {
                    console.log(chalk.green(`✅ Backup completed: ${sessionId} (tracker update skipped)`));
                }
                
                this.isProcessing = false;
                
                // 🆕 CRITICAL: Clear backup flag
                this.setBackupInProgress(sessionId, false);
                
                return true;
            } else {
                throw new Error('Backup storage failed');
            }

        } catch (error) {
            console.error(chalk.red(`❌ Backup failed for ${sessionId}:`), error.message);
            this.stats.totalBackups++;
            this.stats.failedBackups++;
            this.isProcessing = false;
            
            // 🆕 CRITICAL: Clear backup flag even on error
            this.setBackupInProgress(sessionId, false);
            
            return false;
        }
    }

    // 🆕 CRITICAL: Method to set backup in progress flag
    setBackupInProgress(sessionId, inProgress) {
        try {
            const sessionTracker = require('./session-tracker');
            if (sessionTracker && sessionTracker.updateSessionStatus) {
                sessionTracker.updateSessionStatus(sessionId, inProgress ? 'backing_up' : 'active', {
                    backupInProgress: inProgress,
                    lastBackupAttempt: Date.now()
                });
            }
            
            // Also set global flag
            if (!global.backupInProgress) {
                global.backupInProgress = new Set();
            }
            
            if (inProgress) {
                global.backupInProgress.add(sessionId);
            } else {
                global.backupInProgress.delete(sessionId);
            }
        } catch (error) {
            console.log(chalk.yellow('⚠️  Could not set backup progress flag'));
        }
    }

    // 🆕 CRITICAL: Check if session is being backed up
    isSessionBeingBackedUp(sessionId) {
        try {
            if (global.backupInProgress && global.backupInProgress.has(sessionId)) {
                return true;
            }
            
            const sessionTracker = require('./session-tracker');
            const session = sessionTracker.getSession(sessionId);
            return session && session.status === 'backing_up';
        } catch (error) {
            return false;
        }
    }

    // Local backup fallback method
    async createLocalBackup(sessionId, sessionDir) {
        try {
            const backupDir = path.join(__dirname, 'backups', 'local');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const backupPath = path.join(backupDir, `${sessionId}_${Date.now()}.backup`);
            
            // Create a simple copy of the session
            await this.copyDirectory(sessionDir, backupPath);
            
            console.log(chalk.green(`✅ Local backup created: ${path.basename(backupPath)}`));
            return true;

        } catch (error) {
            console.error(chalk.red('❌ Local backup failed:'), error.message);
            return false;
        }
    }

    // Backup all active sessions with protection
    async backupAllSessions() {
        try {
            if (!this.initialized) {
                console.log(chalk.yellow('⚠️  Backup manager not initialized, skipping backup'));
                return { successCount: 0, errorCount: 0 };
            }

            console.log(chalk.blue('💾 Starting backup of all sessions...'));

            // 🆕 CRITICAL: Only backup ACTIVE sessions
            const sessionTracker = require('./session-tracker');
            const activeSessions = sessionTracker.getActiveSessions();
            const sessionIds = activeSessions.map(s => s.sessionId);
            
            let successCount = 0;
            let errorCount = 0;

            console.log(chalk.blue(`📊 Found ${sessionIds.length} ACTIVE sessions to backup`));

            for (const sessionId of sessionIds) {
                try {
                    // 🆕 CRITICAL: Double-check session is still active
                    if (!sessionTracker.isSessionActive(sessionId)) {
                        console.log(chalk.yellow(`⚠️  Skipping backup - session no longer active: ${sessionId}`));
                        continue;
                    }
                    
                    const result = await this.backupSession(sessionId);
                    if (result) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.log(chalk.red(`❌ Failed to backup ${sessionId}: ${error.message}`));
                }

                // Small delay between backups to avoid rate limits
                await this.delay(2000);
            }

            console.log(chalk.green(`🎯 Backup summary: ${successCount} successful, ${errorCount} failed`));
            return { successCount, errorCount };

        } catch (error) {
            console.error(chalk.red('❌ Backup all sessions error:'), error.message);
            return { successCount: 0, errorCount: 1 };
        }
    }

    // Rest of the methods remain the same but with enhanced protection
    async restoreSession(sessionId, forceRestore = false) {
        try {
            const sessionDir = path.join(this.sessionsDir, sessionId);
            
            // If session directory already exists with valid files, no need to restore
            if (fs.existsSync(sessionDir) && this.isValidSession(sessionDir) && !forceRestore) {
                console.log(chalk.green(`✅ Session already exists locally: ${sessionId}`));
                return true;
            }
            
            // Try Telegram restore first if configured
            if (telegramConfig.isConfigured()) {
                console.log(chalk.blue(`🔄 Attempting Telegram restore for: ${sessionId}`));
                try {
                    const result = await telegramStorage.restoreSession(sessionId, sessionDir);
                    if (result) {
                        console.log(chalk.green(`✅ Successfully restored from Telegram: ${sessionId}`));
                        return true;
                    }
                } catch (telegramError) {
                    console.log(chalk.yellow(`⚠️  Telegram restore failed: ${telegramError.message}`));
                }
            }
            
            // Try local backup restore
            console.log(chalk.blue(`🔄 Attempting local backup restore for: ${sessionId}`));
            const localRestored = await this.restoreFromLocalBackup(sessionId);
            if (localRestored) {
                return true;
            }
            
            console.log(chalk.yellow(`⚠️  No backup found for: ${sessionId}`));
            return false;

        } catch (error) {
            console.error(chalk.red(`❌ Restore failed for ${sessionId}:`), error.message);
            return false;
        }
    }

    // Restore from local backup
    async restoreFromLocalBackup(sessionId) {
        try {
            const backupDir = path.join(__dirname, 'backups', 'local');
            if (!fs.existsSync(backupDir)) {
                return false;
            }

            const backupFiles = fs.readdirSync(backupDir)
                .filter(file => file.startsWith(sessionId) && file.endsWith('.backup'))
                .sort()
                .reverse(); // Get newest first

            if (backupFiles.length === 0) {
                return false;
            }

            const newestBackup = backupFiles[0];
            const backupPath = path.join(backupDir, newestBackup);
            const sessionDir = path.join(this.sessionsDir, sessionId);

            // Ensure session directory exists
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Copy backup to session directory
            await this.copyDirectory(backupPath, sessionDir);
            
            console.log(chalk.green(`✅ Restored from local backup: ${newestBackup}`));
            return true;

        } catch (error) {
            console.error(chalk.red('❌ Local backup restore failed:'), error.message);
            return false;
        }
    }

    // Get list of local sessions
    getLocalSessions() {
        try {
            if (!fs.existsSync(this.sessionsDir)) {
                return [];
            }
            
            const sessions = fs.readdirSync(this.sessionsDir).filter(sessionId => {
                const sessionDir = path.join(this.sessionsDir, sessionId);
                return this.isValidSession(sessionDir);
            });
            
            return sessions;

        } catch (error) {
            console.error(chalk.red('❌ Error getting local sessions:'), error.message);
            return [];
        }
    }

    // Get list of stored sessions in Telegram
    async getStoredSessions() {
        try {
            if (!this.initialized || !telegramConfig.isConfigured()) {
                return [];
            }
            
            return await telegramStorage.getStoredSessions();

        } catch (error) {
            console.error(chalk.red('❌ Error getting stored sessions:'), error.message);
            return [];
        }
    }

    // Delete session backup
    async deleteBackup(sessionId) {
        try {
            let deleted = false;

            // Delete from Telegram if configured
            if (telegramConfig.isConfigured()) {
                try {
                    const telegramDeleted = await telegramStorage.deleteSessionBackup(sessionId);
                    if (telegramDeleted) {
                        deleted = true;
                    }
                } catch (error) {
                    console.log(chalk.yellow(`⚠️  Telegram backup deletion failed: ${error.message}`));
                }
            }

            // Delete local backups
            const localDeleted = this.deleteLocalBackup(sessionId);
            if (localDeleted) {
                deleted = true;
            }

            if (deleted) {
                console.log(chalk.green(`✅ Backup deleted: ${sessionId}`));
            } else {
                console.log(chalk.yellow(`⚠️  No backups found to delete: ${sessionId}`));
            }

            return deleted;

        } catch (error) {
            console.error(chalk.red(`❌ Error deleting backup ${sessionId}:`), error.message);
            return false;
        }
    }

    // Delete local backup
    deleteLocalBackup(sessionId) {
        try {
            const backupDir = path.join(__dirname, 'backups', 'local');
            if (!fs.existsSync(backupDir)) {
                return false;
            }

            const backupFiles = fs.readdirSync(backupDir)
                .filter(file => file.startsWith(sessionId) && file.endsWith('.backup'));

            let deletedCount = 0;
            for (const file of backupFiles) {
                try {
                    fs.unlinkSync(path.join(backupDir, file));
                    deletedCount++;
                } catch (error) {
                    console.log(chalk.yellow(`⚠️  Could not delete local backup file: ${file}`));
                }
            }

            return deletedCount > 0;

        } catch (error) {
            console.error(chalk.red('❌ Local backup deletion error:'), error.message);
            return false;
        }
    }

    // Start automatic backup interval
    startAutoBackup() {
        if (this.backupIntervalId) {
            clearInterval(this.backupIntervalId);
        }

        this.backupIntervalId = setInterval(async () => {
            if (this.autoBackupEnabled && this.initialized && !this.isProcessing) {
                console.log(chalk.blue('🔄 Running automatic backup cycle...'));
                await this.backupAllSessions();
            }
        }, this.backupInterval);

        console.log(chalk.green(`✅ Auto-backup started (every ${this.backupInterval / 60000} minutes)`));
    }

    // Stop automatic backup
    stopAutoBackup() {
        if (this.backupIntervalId) {
            clearInterval(this.backupIntervalId);
            this.backupIntervalId = null;
            console.log(chalk.yellow('🛑 Auto-backup stopped'));
        }
    }

    // Manual backup trigger
    async manualBackup(sessionId = null) {
        try {
            if (sessionId) {
                // Backup specific session
                return await this.backupSession(sessionId);
            } else {
                // Backup all sessions
                return await this.backupAllSessions();
            }
        } catch (error) {
            console.error(chalk.red('❌ Manual backup error:'), error.message);
            return false;
        }
    }

    // Set backup interval
    setBackupInterval(minutes) {
        const newInterval = minutes * 60 * 1000;
        
        if (newInterval < 2 * 60 * 1000) { // Minimum 2 minutes
            console.log(chalk.red('❌ Backup interval must be at least 2 minutes'));
            return false;
        }
        
        this.backupInterval = newInterval;
        
        if (this.autoBackupEnabled) {
            this.stopAutoBackup();
            this.startAutoBackup();
        }
        
        console.log(chalk.green(`✅ Backup interval set to ${minutes} minutes`));
        return true;
    }

    // Toggle auto backup
    setAutoBackup(enabled) {
        this.autoBackupEnabled = enabled;
        
        if (enabled && !this.backupIntervalId) {
            this.startAutoBackup();
        } else if (!enabled && this.backupIntervalId) {
            this.stopAutoBackup();
        }
        
        console.log(chalk.green(`✅ Auto-backup ${enabled ? 'enabled' : 'disabled'}`));
        return true;
    }

    // Helper methods
    isValidSession(sessionDir) {
        try {
            if (!fs.existsSync(sessionDir)) return false;
            
            const files = this.readDirectoryRecursive(sessionDir);
            if (files.length === 0) return false;
            
            // Check for common session files
            const hasSessionFiles = files.some(file => 
                file.includes('creds') || 
                file.includes('session') || 
                file.includes('app-state')
            );
            
            return hasSessionFiles && files.length > 0;

        } catch (error) {
            return false;
        }
    }

    readDirectoryRecursive(dir) {
        const files = [];
        
        function read(currentDir) {
            const items = fs.readdirSync(currentDir);
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    read(fullPath);
                } else {
                    files.push(fullPath);
                }
            }
        }
        
        try {
            read(dir);
        } catch (error) {
            // Ignore read errors
        }
        
        return files;
    }

    async copyDirectory(src, dest) {
        try {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }

            const items = fs.readdirSync(src);
            
            for (const item of items) {
                const srcPath = path.join(src, item);
                const destPath = path.join(dest, item);
                const stat = fs.statSync(srcPath);

                if (stat.isDirectory()) {
                    await this.copyDirectory(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
            
            return true;
        } catch (error) {
            throw new Error(`Copy failed: ${error.message}`);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get status
    getStatus() {
        const localSessions = this.getLocalSessions();
        
        return {
            initialized: this.initialized,
            autoBackupEnabled: this.autoBackupEnabled,
            backupInterval: this.backupInterval,
            isProcessing: this.isProcessing,
            telegramConfigured: telegramConfig.isConfigured(),
            localSessions: localSessions.length,
            lastBackup: this.stats.lastBackup ? new Date(this.stats.lastBackup).toLocaleString() : 'Never',
            statistics: this.stats
        };
    }

    // Get detailed backup information
    getBackupInfo() {
        const localSessions = this.getLocalSessions();
        const sessionInfo = localSessions.map(sessionId => {
            const lastBackup = this.lastBackupTimes.get(sessionId);
            return {
                sessionId,
                lastBackup: lastBackup ? new Date(lastBackup).toLocaleString() : 'Never',
                backupAge: lastBackup ? Math.round((Date.now() - lastBackup) / 60000) + ' min ago' : 'Never'
            };
        });

        return {
            status: this.getStatus(),
            sessions: sessionInfo
        };
    }

    // Health check
    async healthCheck() {
        try {
            if (!this.initialized) return { healthy: false, reason: 'Not initialized' };
            
            // Check sessions directory
            if (!fs.existsSync(this.sessionsDir)) {
                return { healthy: false, reason: 'Sessions directory missing' };
            }

            // Check Telegram connection if configured
            if (telegramConfig.isConfigured()) {
                const telegramHealthy = await telegramStorage.healthCheck();
                if (!telegramHealthy) {
                    return { healthy: false, reason: 'Telegram storage unavailable' };
                }
            }

            return { healthy: true, reason: 'All systems operational' };

        } catch (error) {
            return { healthy: false, reason: error.message };
        }
    }

    // Cleanup old local backups
    cleanupOldBackups(maxAgeDays = 30) {
        try {
            const backupDir = path.join(__dirname, 'backups', 'local');
            if (!fs.existsSync(backupDir)) {
                return { deleted: 0, error: 'Backup directory not found' };
            }

            const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
            const backupFiles = fs.readdirSync(backupDir);
            let deletedCount = 0;

            for (const file of backupFiles) {
                try {
                    const filePath = path.join(backupDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.mtimeMs < cutoffTime) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                } catch (error) {
                    console.log(chalk.yellow(`⚠️  Could not delete old backup: ${file}`));
                }
            }

            console.log(chalk.green(`🧹 Cleaned up ${deletedCount} old local backups`));
            return { deleted: deletedCount, error: null };

        } catch (error) {
            console.error(chalk.red('❌ Backup cleanup error:'), error.message);
            return { deleted: 0, error: error.message };
        }
    }
}

// Create and export instance
const backupManager = new BackupManager();

// Auto-initialize with delay
setTimeout(async () => {
    await backupManager.initialize();
}, 2000);

// Handle process exit
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🔄 Shutting down BackupManager...'));
    backupManager.stopAutoBackup();
});

module.exports = backupManager;