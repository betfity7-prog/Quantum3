const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SessionTracker {
    constructor() {
        this.trackerFile = path.join(__dirname, 'session-tracker.json');
        this.sessions = this.loadSessions();
        this.cleanupInterval = setInterval(() => this.cleanupOldSessions(), 10 * 60 * 1000); // 10 minutes
        this.maxSessionAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        this.maxInactiveTime = 72 * 60 * 60 * 1000; // 72 hours
        this.heartbeatThreshold = 10 * 60 * 1000; // 10 minute heartbeat threshold
        
        this.stats = {
            totalAdded: 0,
            totalRemoved: 0,
            cleanupRuns: 0,
            lastCleanup: null,
            falseInactiveDetections: 0
        };
        
        console.log(chalk.green('✅ ENHANCED SessionTracker initialized with heartbeat monitoring'));
    }

    // Load sessions from file
    loadSessions() {
        try {
            if (fs.existsSync(this.trackerFile)) {
                const data = JSON.parse(fs.readFileSync(this.trackerFile, 'utf8'));
                console.log(chalk.blue(`📊 Loaded ${Object.keys(data.sessions || {}).length} tracked sessions`));
                this.stats = data.stats || this.stats;
                return data.sessions || {};
            }
            return {};
        } catch (error) {
            console.error(chalk.red('❌ Error loading session tracker:'), error);
            return {};
        }
    }

    // Save sessions to file
    saveSessions() {
        try {
            const data = {
                sessions: this.sessions,
                stats: this.stats,
                lastSave: Date.now(),
                totalSessions: Object.keys(this.sessions).length
            };
            fs.writeFileSync(this.trackerFile, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(chalk.red('❌ Error saving session tracker:'), error);
            return false;
        }
    }

    // Add a new session
    addSession(sessionId, phoneNumber) {
        // Check if session already exists
        if (this.sessions[sessionId]) {
            console.log(chalk.yellow(`⚠️  Session ${sessionId} already tracked, updating...`));
        }

        this.sessions[sessionId] = {
            phoneNumber: phoneNumber,
            createdAt: Date.now(),
            lastActive: Date.now(),
            lastHeartbeat: Date.now(),
            lastBackup: null,
            backedUp: false,
            activityCount: 0,
            status: 'active',
            messageCount: 0,
            connectionTime: 0
        };

        this.stats.totalAdded++;
        this.saveSessions();
        console.log(chalk.green(`✅ Tracked session: ${sessionId} (${phoneNumber})`));
        
        return this.sessions[sessionId];
    }

    // HEARTBEAT SYSTEM - Track real-time activity
    updateHeartbeat(sessionId) {
        if (this.sessions[sessionId]) {
            this.sessions[sessionId].lastHeartbeat = Date.now();
            this.sessions[sessionId].lastActive = Date.now();
            this.sessions[sessionId].activityCount = (this.sessions[sessionId].activityCount || 0) + 1;
            
            // Mark as definitely active
            this.sessions[sessionId].status = 'active';
            
            // Auto-save every 20 activity updates (reduced frequency)
            if (this.sessions[sessionId].activityCount % 20 === 0) {
                this.saveSessions();
            }
        }
    }

    // Update session activity
    updateSessionActivity(sessionId) {
        this.updateHeartbeat(sessionId); // Use heartbeat system
    }

    // Mark session as backed up
    markBackedUp(sessionId) {
        if (this.sessions[sessionId]) {
            this.sessions[sessionId].backedUp = true;
            this.sessions[sessionId].lastBackup = Date.now();
            this.sessions[sessionId].backupCount = (this.sessions[sessionId].backupCount || 0) + 1;
            this.saveSessions();
            console.log(chalk.green(`✅ Marked ${sessionId} as backed up`));
        }
    }

    // Update session status
    updateSessionStatus(sessionId, status, additionalData = {}) {
        if (this.sessions[sessionId]) {
            this.sessions[sessionId].status = status;
            this.sessions[sessionId].lastActive = Date.now();
            
            // Merge additional data
            Object.assign(this.sessions[sessionId], additionalData);
            
            // Save on status changes
            this.saveSessions();
            console.log(chalk.blue(`🔄 Session ${sessionId} status: ${status}`));
        }
    }

    // Increment message count
    incrementMessageCount(sessionId) {
        if (this.sessions[sessionId]) {
            this.sessions[sessionId].messageCount = (this.sessions[sessionId].messageCount || 0) + 1;
            this.updateHeartbeat(sessionId); // Also update heartbeat on message
            
            // Auto-save every 50 messages to reduce disk I/O
            if (this.sessions[sessionId].messageCount % 50 === 0) {
                this.saveSessions();
            }
        }
    }

    // Check if session is truly active using heartbeat
    isSessionActive(sessionId) {
        if (!this.sessions[sessionId]) return false;
        
        const session = this.sessions[sessionId];
        const now = Date.now();
        
        // Check heartbeat first (most reliable)
        if (session.lastHeartbeat && (now - session.lastHeartbeat) < this.heartbeatThreshold) {
            return true;
        }
        
        // Fallback to lastActive with generous threshold
        if (session.lastActive && (now - session.lastActive) < (this.maxInactiveTime / 2)) {
            return true;
        }
        
        // Check if session files exist as last resort
        const sessionDir = path.join(__dirname, 'sessions', sessionId);
        return fs.existsSync(sessionDir);
    }

    // FIXED: getActiveSessions - No more false inactive marking!
    getActiveSessions() {
        const now = Date.now();
        return Object.entries(this.sessions)
            .filter(([sessionId, data]) => {
                const sessionDir = path.join(__dirname, 'sessions', sessionId);
                const sessionExists = fs.existsSync(sessionDir);
                
                // Use heartbeat-based active check
                const isActive = this.isSessionActive(sessionId) && sessionExists;
                
                // CRITICAL FIX: Don't auto-update status here - it causes race conditions!
                // Only update if we're absolutely sure
                if (sessionExists && !isActive) {
                    // Double-check with more lenient criteria
                    const timeSinceActive = now - data.lastActive;
                    if (timeSinceActive < (this.maxInactiveTime / 2)) { // 36 hours threshold
                        this.sessions[sessionId].status = 'active';
                        return true;
                    }
                }
                
                return isActive;
            })
            .map(([sessionId, data]) => ({
                sessionId,
                ...data,
                isOnline: this.isSessionOnline(sessionId)
            }));
    }

    // FIXED: getInactiveSessions - More accurate detection
    getInactiveSessions() {
        const now = Date.now();
        return Object.entries(this.sessions)
            .filter(([sessionId, data]) => {
                const sessionDir = path.join(__dirname, 'sessions', sessionId);
                const sessionExists = fs.existsSync(sessionDir);
                
                // Only mark as inactive if definitely not active
                const definitelyInactive = 
                    !this.isSessionActive(sessionId) && 
                    sessionExists && // Only consider sessions that actually exist
                    (now - data.lastActive) >= this.maxInactiveTime;
                
                return definitelyInactive;
            })
            .map(([sessionId, data]) => ({
                sessionId,
                ...data,
                inactiveFor: Math.round((now - data.lastActive) / 60000),
                hasFiles: fs.existsSync(path.join(__dirname, 'sessions', sessionId))
            }));
    }

    // Get orphaned sessions (no files)
    getOrphanedSessions() {
        return Object.entries(this.sessions)
            .filter(([sessionId, data]) => {
                const sessionDir = path.join(__dirname, 'sessions', sessionId);
                return !fs.existsSync(sessionDir);
            })
            .map(([sessionId, data]) => ({
                sessionId,
                ...data,
                orphanedFor: Math.round((Date.now() - data.lastActive) / 60000)
            }));
    }

    // Get all sessions
    getAllSessions() {
        return this.sessions;
    }

    // Get specific session
    getSession(sessionId) {
        return this.sessions[sessionId];
    }

    // Check if session is online
    isSessionOnline(sessionId) {
        try {
            if (!this.sessions[sessionId]) return false;
            
            const sessionDir = path.join(__dirname, 'sessions', sessionId);
            if (!fs.existsSync(sessionDir)) return false;

            // Use heartbeat for online status
            const now = Date.now();
            const lastHeartbeat = this.sessions[sessionId].lastHeartbeat;
            return lastHeartbeat && (now - lastHeartbeat) < 5 * 60 * 1000; // 5 minutes
        } catch (error) {
            return false;
        }
    }

    // Remove session from tracker
    removeSession(sessionId) {
        if (this.sessions[sessionId]) {
            const sessionData = this.sessions[sessionId];
            delete this.sessions[sessionId];
            this.stats.totalRemoved++;
            this.saveSessions();
            
            console.log(chalk.yellow(`🗑️  Removed session from tracker: ${sessionId}`));
            
            // Return removed session data for cleanup
            return sessionData;
        }
        return null;
    }

    // ENHANCED: Cleanup with safety checks
    cleanupOldSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        let freedSpace = 0;

        this.stats.cleanupRuns++;
        this.stats.lastCleanup = now;

        console.log(chalk.blue(`🧹 SAFE session cleanup (Run #${this.stats.cleanupRuns})...`));

        // Get truly inactive sessions first
        const inactiveSessions = this.getInactiveSessions();
        
        for (const sessionData of inactiveSessions) {
            const { sessionId } = sessionData;
            const sessionDir = path.join(__dirname, 'sessions', sessionId);
            
            // EXTRA SAFETY CHECK: Verify session is really inactive
            if (this.isSessionActive(sessionId)) {
                console.log(chalk.yellow(`   ⚠️  Skipping ACTIVE session: ${sessionId}`));
                this.stats.falseInactiveDetections++;
                continue;
            }

            try {
                const removedSession = this.removeSession(sessionId);
                if (removedSession) {
                    cleanedCount++;
                    
                    // Calculate freed space
                    if (fs.existsSync(sessionDir)) {
                        try {
                            const stats = fs.statSync(sessionDir);
                            freedSpace += stats.size;
                            
                            // Actually delete the session files
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                            console.log(chalk.yellow(`   🗑️  Cleaned ${sessionId}: inactive for ${sessionData.inactiveFor}min`));
                        } catch (e) {
                            console.log(chalk.red(`   ❌ Error deleting files for ${sessionId}:`), e.message);
                        }
                    }
                }
            } catch (error) {
                console.log(chalk.red(`   ❌ Error cleaning ${sessionId}:`), error.message);
            }
        }

        if (cleanedCount > 0) {
            const freedMB = Math.round(freedSpace / 1024 / 1024);
            console.log(chalk.green(`🎯 SAFE Cleanup completed: ${cleanedCount} sessions removed, ~${freedMB}MB freed`));
            this.saveSessions();
        } else {
            console.log(chalk.gray('   ℹ️  No inactive sessions to clean up'));
        }

        return { cleanedCount, freedSpace };
    }

    // Force cleanup of specific sessions
    forceCleanupSessions(sessionIds) {
        let cleanedCount = 0;
        
        for (const sessionId of sessionIds) {
            if (this.sessions[sessionId]) {
                this.removeSession(sessionId);
                cleanedCount++;
            }
        }
        
        console.log(chalk.green(`🔥 Force cleaned ${cleanedCount} sessions`));
        return cleanedCount;
    }

    // Get sessions that need backup
    getSessionsNeedingBackup(maxAge = 60 * 60 * 1000) {
        const now = Date.now();
        return Object.entries(this.sessions)
            .filter(([sessionId, data]) => {
                const needsBackup = !data.backedUp || 
                                  (data.lastBackup && (now - data.lastBackup > maxAge));
                const sessionExists = fs.existsSync(path.join(__dirname, 'sessions', sessionId));
                return needsBackup && sessionExists && this.isSessionActive(sessionId);
            })
            .map(([sessionId, data]) => ({
                sessionId,
                ...data,
                sinceLastBackup: data.lastBackup ? Math.round((now - data.lastBackup) / 60000) : null
            }));
    }

    // Get session health status
    getSessionHealth(sessionId) {
        if (!this.sessions[sessionId]) return 'unknown';
        
        const session = this.sessions[sessionId];
        const now = Date.now();
        const timeSinceHeartbeat = session.lastHeartbeat ? now - session.lastHeartbeat : Infinity;
        
        if (timeSinceHeartbeat < 5 * 60 * 1000) return 'healthy'; // <5 minutes
        if (timeSinceHeartbeat < 30 * 60 * 1000) return 'degraded'; // <30 minutes
        if (timeSinceHeartbeat < this.maxInactiveTime) return 'inactive'; // <72 hours
        return 'expired';
    }

    // Emergency session recovery
    recoverSession(sessionId) {
        if (this.sessions[sessionId]) {
            this.sessions[sessionId].status = 'active';
            this.sessions[sessionId].lastActive = Date.now();
            this.sessions[sessionId].lastHeartbeat = Date.now();
            this.sessions[sessionId].recoveredAt = Date.now();
            this.sessions[sessionId].recoveryCount = (this.sessions[sessionId].recoveryCount || 0) + 1;
            
            this.saveSessions();
            console.log(chalk.green(`🔄 Recovered session: ${sessionId}`));
            return true;
        }
        return false;
    }

    // Get session statistics
    getStats() {
        const activeSessions = this.getActiveSessions();
        const inactiveSessions = this.getInactiveSessions();
        const orphanedSessions = this.getOrphanedSessions();
        const needingBackup = this.getSessionsNeedingBackup();

        const totalMessageCount = Object.values(this.sessions)
            .reduce((sum, session) => sum + (session.messageCount || 0), 0);

        const averageActivity = Object.values(this.sessions)
            .reduce((sum, session) => sum + (session.activityCount || 0), 0) / 
            Math.max(1, Object.keys(this.sessions).length);

        return {
            total: Object.keys(this.sessions).length,
            active: activeSessions.length,
            inactive: inactiveSessions.length,
            orphaned: orphanedSessions.length,
            needingBackup: needingBackup.length,
            totalMessages: totalMessageCount,
            averageActivity: Math.round(averageActivity),
            falseInactiveDetections: this.stats.falseInactiveDetections,
            ...this.stats,
            lastCleanup: this.stats.lastCleanup ? new Date(this.stats.lastCleanup).toISOString() : null
        };
    }

    // Export session data for monitoring
    exportSessionData() {
        return {
            sessions: this.sessions,
            stats: this.getStats(),
            timestamp: Date.now(),
            version: '2.1'
        };
    }

    // Import session data (for migrations)
    importSessionData(data) {
        if (data.sessions && typeof data.sessions === 'object') {
            this.sessions = { ...this.sessions, ...data.sessions };
            this.saveSessions();
            console.log(chalk.green(`✅ Imported ${Object.keys(data.sessions).length} sessions`));
            return true;
        }
        return false;
    }

    // Reset tracker (dangerous - for testing only)
    reset() {
        this.sessions = {};
        this.stats = {
            totalAdded: 0,
            totalRemoved: 0,
            cleanupRuns: 0,
            lastCleanup: null,
            falseInactiveDetections: 0
        };
        this.saveSessions();
        console.log(chalk.red('🗑️  Session tracker reset to empty'));
    }

    // Graceful shutdown
    destroy() {
        clearInterval(this.cleanupInterval);
        this.saveSessions();
        console.log(chalk.green('✅ SessionTracker shutdown complete'));
    }
}

// Auto-save every 10 minutes to prevent data loss
const trackerInstance = new SessionTracker();
setInterval(() => {
    trackerInstance.saveSessions();
}, 10 * 60 * 1000);

// Handle process exit
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🔄 Saving session tracker before exit...'));
    trackerInstance.saveSessions();
    trackerInstance.destroy();
    process.exit(0);
});

module.exports = trackerInstance;