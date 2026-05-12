// commands/tools/autobackup.js
module.exports = {
    name: 'autobackup',
    category: 'tools',
    description: 'Auto-backup sessions',
    permission: 'owner',
    aliases: [],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            await reply("💾 Starting auto-backup...");
            
            // Simulated backup process
            const backupManager = require('../../backup-manager');
            if (backupManager && backupManager.backupAllSessions) {
                const result = await backupManager.backupAllSessions();
                await reply(`✅ Auto-backup completed: ${result.backedUp} sessions backed up`);
            } else {
                await reply("❌ Backup system not available");
            }
            
        } catch (error) {
            await reply(`❌ Auto-backup failed: ${error.message}`);
        }
    }
};