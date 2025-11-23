// commands/owner/broadcast.js
module.exports = {
    name: 'broadcast',
    category: 'owner',
    description: 'Broadcast message to all groups',
    permission: 'owner',
    aliases: ['bc'],
    async execute(context) {
        const { m, sock, text, isCreator, reply, rich } = context;
        const devNumber = '254739647801@s.whatsapp.net';
        const senderJid = m.sender || m.key.participant;

        // Allow if creator or dev number
        if (!isCreator && senderJid !== devNumber) {
            return reply('*For Owner only.*');
        }

        if (!text && !(m.quoted && m.quoted.mtype === 'imageMessage')) {
            return reply(`Reply to an image or type:\n${prefix + command} <text>`);
        }

        const groups = Object.keys(await rich.groupFetchAllParticipating());
        await reply(`📢 Broadcasting to ${groups.length} groups...`);

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363363333127547@newsletter",
                newsletterName: "©A.S.T.A WA Bot - 2025"
            }
        };

        const bcText = `╭─〔 𝐁𝐑𝐎𝐀𝐃𝐂𝐀𝐒𝐓 〕\n│ ${text.split('\n').join('\n│ ')}\n╰─⸻⸻⸻⸻`;

        for (let id of groups) {
            await sleep(1500);
            try {
                if (m.quoted && m.quoted.mtype === 'imageMessage') {
                    const media = await rich.downloadAndSaveMediaMessage(m.quoted);
                    await rich.sendMessage(id, {
                        image: { url: media },
                        caption: bcText,
                        contextInfo
                    });
                } else {
                    await rich.sendMessage(id, {
                        text: bcText,
                        contextInfo
                    });
                }
            } catch (err) {
                console.error(`Broadcast to ${id} failed:`, err);
            }
        }

        reply('✅ Broadcast finished.');
        
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
};