// commands/group/totalmembers.js
module.exports = {
    name: 'totalmembers',
    category: 'group',
    description: 'Show group member count',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess, groupMetadata, participants } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            let message = `👥 *GROUP MEMBERS*\n\n` +
                          `*Group:* ${groupMetadata?.subject || 'Unknown'}\n` +
                          `*Total Members:* ${participants.length}\n` +
                          `*Admins:* ${participants.filter(p => p.admin).length}\n` +
                          `*Members:* ${participants.filter(p => !p.admin).length}`;
            reply(message);
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};