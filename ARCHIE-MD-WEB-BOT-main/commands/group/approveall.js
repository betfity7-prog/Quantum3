// commands/group/approveall.js
module.exports = {
    name: 'approveall',
    category: 'group',
    description: 'Approve all pending requests',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            await reply("✅ All pending requests approved!");
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};