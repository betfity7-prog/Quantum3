// commands/tools/listgc.js
module.exports = {
    name: 'listgc',
    category: 'tools',
    description: 'List all group chats',
    permission: 'owner',
    aliases: ['grouplist'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        try {
            const groups = await sock.groupFetchAllParticipating();
            let groupList = Object.keys(groups);
            let teks = `🏢 *GROUP CHAT LIST*\n\nTotal Groups: ${groupList.length} Groups\n\n`;
            
            for (let i of groupList) {
                let metadata = groups[i];
                teks += `🏢 *Name:* ${metadata.subject}\n👑 *Owner:* @${metadata.owner?.split("@")[0] || "Unknown"}\n🆔 *ID:* ${metadata.id}\n👥 *Members:* ${metadata.participants?.length || 0}\n\n────────────────────────\n\n`;
            }
            
            await sock.sendMessage(m.chat, { 
                text: teks, 
                mentions: teks.match(/@[0-9]+/g) || [] 
            }, { quoted: m });
        } catch (error) {
            reply('❌ Error fetching group list');
        }
    }
};