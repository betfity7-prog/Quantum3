// commands/group/rejectall.js
module.exports = {
    name: 'rejectall',
    category: 'group',
    description: 'Reject all pending requests',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            await reply("✅ All pending requests rejected!");
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};