// commands/tools/uptime.js
module.exports = {
    name: 'uptime',
    category: 'tools',
    description: 'Show bot uptime',
    permission: 'all',
    aliases: ['runtime'],
    async execute(context) {
        const { m, sock, reply } = context;
        const currentTime = Date.now();
        const uptimeInMillis = currentTime - global.botStartTime;
        const formattedUptime = this.formatUptime(uptimeInMillis);

        await sock.sendMessage(m.chat, {
            text: `*UPTIME OF ARCHIE MD WEB BOT: ${formattedUptime}*`
        }, {
            quoted: {
                key: { 
                    fromMe: false, 
                    participant: `0@s.whatsapp.net`, 
                    remoteJid: 'status@broadcast' 
                },
                message: {
                    contactMessage: {
                        displayName: 'Archie MD Web Bot ✅',
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Archie Tech;;;\nFN:Archie MD Web Bot ✅\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Mobile\nEND:VCARD`,
                    },
                },
            }
        });
    },

    formatUptime(ms) {
        const sec = Math.floor(ms / 1000) % 60;
        const min = Math.floor(ms / (1000 * 60)) % 60;
        const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
        const day = Math.floor(ms / (1000 * 60 * 60 * 24));

        const parts = [];
        if (day === 1) parts.push(`1 day`);
        else if (day > 1) parts.push(`${day} days`);
        if (hr === 1) parts.push(`1 hour`);
        else if (hr > 1) parts.push(`${hr} hours`);
        if (min === 1) parts.push(`1 minute`);
        else if (min > 1) parts.push(`${min} minutes`);
        if (sec === 1) parts.push(`1 second`);
        else if (sec > 1 || parts.length === 0) parts.push(`${sec} seconds`);
        return parts.join(', ') || '0 seconds';
    }
};