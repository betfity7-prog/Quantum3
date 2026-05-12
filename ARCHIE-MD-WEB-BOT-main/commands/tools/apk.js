// commands/tools/apk.js
module.exports = {
    name: 'apk',
    category: 'tools',
    description: 'Download APK files',
    permission: 'all',
    aliases: ['app', 'apps', 'application', 'ap'],
    async execute(context) {
        const { m, sock, text, reply, fetchJson } = context;
        
        if (!text) return reply("*Which apk do you want to download?*");
        
        let kyuu = await fetchJson(`https://bk9.fun/search/apk?q=${text}`);
        let tylor = await fetchJson(`https://bk9.fun/download/apk?id=${kyuu.BK9[0].id}`);
        
        await sock.sendMessage(m.chat, {
            document: { url: tylor.BK9.dllink },
            fileName: tylor.BK9.name,
            mimetype: "application/vnd.android.package-archive",
            contextInfo: {
                externalAdReply: {
                    title: global.botname,
                    body: `${tylor.BK9.name}`,
                    thumbnailUrl: `${tylor.BK9.icon}`,
                    sourceUrl: `${tylor.BK9.dllink}`,
                    mediaType: 2,
                    showAdAttribution: true,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: m });
    }
};