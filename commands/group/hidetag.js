// commands/group/hidetag.js
module.exports = {
    name: 'hidetag',
    category: 'group',
    description: 'Silent mention all members',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, text, isGroup, reply, mess, participants, quoted } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            const quotedText = quoted ? quoted.text : null;
            const providedText = text?.split(" ").slice(1).join(" ") || null;
            const textToSend = quotedText || providedText || "📢 Announcement from admin";
            
            await sock.sendMessage(m.chat, {
                text: textToSend,
                mentions: participants.map(a => a.id)
            });
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};