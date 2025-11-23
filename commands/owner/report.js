// commands/owner/report.js
module.exports = {
    name: 'report',
    category: 'owner',
    description: 'Show developer contact info',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { reply } = context;
        await reply(`=====[ *ARCHIE-XMD DEVELOPER* ]===== \n• Contact: https://wa.me/${global.owner}\n• Telegram: t.me/lopez629`);
    }
};