// commands/group/vcf.js
module.exports = {
    name: 'vcf',
    category: 'group',
    description: 'Export group contacts as VCF',
    permission: 'public',
    aliases: [],
    async execute(context) {
        const { m, sock, isGroup, reply, mess, participants, groupMetadata } = context;
        if (!isGroup) return reply(mess.group);
        
        try {
            let vcard = "";
            let noPort = 0;
            
            for (let a of participants) {
                vcard += `BEGIN:VCARD\nVERSION:3.0\nFN:[${noPort++}] +${a.id.split("@")[0]}\nTEL;type=CELL;type=VOICE;waid=${a.id.split("@")[0]}:+${a.id.split("@")[0]}\nEND:VCARD\n`;
            }
            
            await reply(`💾 Saving ${participants.length} contacts...`);
            
            await sock.sendMessage(m.chat, {
                document: Buffer.from(vcard),
                fileName: `Group_Contacts_${groupMetadata.subject || 'Unknown'}.vcf`,
                mimetype: 'text/vcard',
                caption: `*📞 Group Contacts*\nGroup: *${groupMetadata.subject}*\nContacts: *${participants.length}*`
            });
        } catch (error) {
            reply("❌ Failed: " + error.message);
        }
    }
};