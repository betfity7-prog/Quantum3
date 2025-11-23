// commands/tools/leavegc.js
module.exports = {
    name: 'leavegc',
    category: 'tools',
    description: 'Leave current group',
    permission: 'owner',
    aliases: ['leavegroup'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        await sock.groupLeave(m.chat);
        await reply(`Successfully left the group - Archie MD`);
    }
};