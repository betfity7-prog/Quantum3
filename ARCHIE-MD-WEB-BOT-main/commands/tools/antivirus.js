// commands/tools/antivirus.js
module.exports = {
    name: 'antivirus',
    category: 'tools',
    description: 'Anti-virus protection',
    permission: 'admin',
    aliases: ['antivirtex'],
    async execute(context) {
        const { m, sock, args, isGroup, reply } = context;
        if (!isGroup) return reply("This command only works in groups");
        
        if (args[0] === "on") {
            reply("Antivirus activated in this group - Archie MD Security");
            await sock.sendMessage(m.chat, {
                text: `\`\`\`「 ⚠️Warning⚠️ 」\`\`\`\n\nNo one is allowed to send viruses in this group. Members who send viruses will be dealt with immediately! - Archie MD Security`,
            }, { quoted: m });
        } else if (args[0] === "off") {
            reply("Antivirus deactivated in this group");
        } else {
            reply("Usage: antivirus on/off");
        }
    }
};