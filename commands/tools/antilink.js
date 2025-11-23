// commands/tools/antilink.js
module.exports = {
    name: 'antilink',
    category: 'tools',
    description: 'Anti-link protection',
    permission: 'admin',
    aliases: [],
    async execute(context) {
        const { m, sock, text, isGroup, reply } = context;
        if (!isGroup) return reply('⚠️ This command works only in groups.');

        const mode = (text || '').trim().toLowerCase();
        if (!['delete', 'remove', 'off'].includes(mode)) {
            return reply(`Usage:
> .antilink delete
> .antilink remove
> .antilink off`);
        }

        // Remove old listener if already running
        if (sock.antilinkListener && sock.antilinkListenerChatId === m.chat) {
            sock.ev.off('messages.upsert', sock.antilinkListener);
            sock.antilinkListener = null;
            sock.antilinkListenerChatId = null;
        }

        if (mode === 'off') {
            return reply('✅ Antilink mode has been disabled.');
        }

        // Fixed regex
        const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/|chat\.whatsapp\.com\/)/i;

        // Define listener
        sock.antilinkListener = async (event) => {
            try {
                const msg = event.messages?.[0];
                if (!msg || msg.key.remoteJid !== m.chat) return;

                const body =
                    msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    msg.message?.imageMessage?.caption ||
                    '';

                if (linkRegex.test(body)) {
                    const sender = msg.key.participant || msg.key.remoteJid;

                    // Delete the link message
                    try {
                        await sock.sendMessage(m.chat, { delete: msg.key });
                    } catch (err) {
                        console.error('Delete failed:', err);
                    }

                    // Remove sender if "remove" mode
                    if (mode === 'remove') {
                        try {
                            await sock.groupParticipantsUpdate(m.chat, [sender], 'remove');
                            await sock.sendMessage(m.chat, {
                                text: `🚷 @${sender.split('@')[0]} removed for posting a link.`,
                                mentions: [sender]
                            });
                        } catch (kickErr) {
                            console.error('Kick failed:', kickErr);
                        }
                    }
                }
            } catch (err) {
                console.error('Error in antilink listener:', err);
            }
        };

        // Attach listener to Baileys event emitter
        sock.antilinkListenerChatId = m.chat;
        sock.ev.on('messages.upsert', sock.antilinkListener);

        reply(`✅ Antilink mode *${mode.toUpperCase()}* is now active.`);
    }
};