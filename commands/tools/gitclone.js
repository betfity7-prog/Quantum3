module.exports = {
    name: 'gitclone',
    category: 'tools',
    description: 'Clone GitHub repositories',
    aliases: ['git'],
    permission: 'all',
    async execute(context) {
        const { m, sock, args, reply, fetch } = context;
        
        if (!args[0]) return reply(`ᴡʜᴇʀᴇ ɪs ᴛʜᴇ ʟɪɴᴋ ?\nᴇxᴇᴍᴘʟᴇ :\n${prefix}${command} https://github.com/shadowwrld/SHADOW-X`);
        
        if (!isUrl(args[0]) && !args[0].includes('github.com')) return reply(`ʟɪɴᴋ ɪɴᴠᴀʟɪᴅ !!`);
        
        try {
            let regex1 = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
            let [, user, repo] = args[0].match(regex1) || [];
            repo = repo.replace(/.git$/, '');
            
            let url = `https://api.github.com/repos/${user}/${repo}/zipball`;
            let filename = (await fetch(url, { method: 'HEAD' })).headers.get('content-disposition').match(/attachment; filename=(.*)/)[1];
            
            await sock.sendMessage(m.chat, { 
                document: { url: url }, 
                fileName: filename + '.zip', 
                mimetype: 'application/zip' 
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            return reply("❌ Failed to clone repository");
        }
    }
};