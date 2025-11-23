// commands/owner/dev.js
module.exports = {
    name: 'dev',
    category: 'owner',
    description: 'Show developer contact',
    permission: 'all',
    aliases: ['devoloper', 'owner', 'xowner'],
    async execute(context) {
        const { m, sock, reply } = context;
        let namaown = `ARCHIETECH ϟ`;
        let NoOwn = `237695717815`;
        
        const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");
        
        var contact = await generateWAMessageFromContent(m.chat, {
            contactMessage: {
                displayName: namaown,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;;;;\nFN:${namaown}\nitem1.TEL;waid=${NoOwn}:+${NoOwn}\nitem1.X-ABLabel:Phone\nX-WA-BIZ-DESCRIPTION:JavaScript Developer\nX-WA-BIZ-NAME:Archie-XMD Bot\nEND:VCARD`
            }
        }, { userJid: m.chat, quoted: m });
        
        await sock.relayMessage(m.chat, contact.message, { messageId: contact.key.id });
    }
};