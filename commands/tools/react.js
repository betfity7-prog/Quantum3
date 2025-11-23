// commands/tools/react.js
module.exports = {
    name: 'react',
    category: 'tools',
    description: 'React to message with emoji',
    permission: 'all',
    aliases: ['reaction'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        
        if (!args[0]) return reply("Please provide an emoji to react with");
        
        let reactionMessage = {
            react: {
                text: args[0],
                key: {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.quoted?.id || m.id
                }
            }
        };
        
        await sock.sendMessage(m.chat, reactionMessage);
    }
};