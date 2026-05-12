// commands/tools/test.js
module.exports = {
    name: 'test',
    category: 'tools',
    description: 'Test bot functionality',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { reply, pushname, isGroup, isAdmins, isBotAdmins } = context;
        
        reply(`✅ Bot working!\nUser: ${pushname}\nGroup: ${isGroup}\nAdmin: ${isAdmins}\nBot Admin: ${isBotAdmins}`);
    }
};