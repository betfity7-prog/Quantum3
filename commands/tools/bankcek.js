// commands/tools/bankcek.js
module.exports = {
    name: 'bankcek',
    category: 'tools',
    description: 'Check bank balance',
    permission: 'all',
    aliases: ['bank'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        if (!m.isGroup) return reply("This command only works in groups");
        
        let who = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.sender;
        if (!(who in global.db.users)) {
            global.db.users[who] = {
                name: "User",
                atm: 0,
                bank: 0,
                fullatm: 1000,
                money: 1000,
                level: 1,
                registered: false
            };
        }
        
        let user = global.db.users[who];
        let caption = `
🏦 *BANK CHECK*
│ 👤 Name: ${user.registered ? user.name : "User"}
│ 💳 ATM: ${user.atm > 0 ? "Level " + user.atm : "✖️"}
│ 🏦 Bank: ${user.bank} / ${user.fullatm || 1000}
│ 💰 Money: ${user.money}
│ 🎯 Level: ${user.level}
│ 🤖 Status: ${user.level > 999 ? "Elite User" : "Regular User"}
│ 📑 Registered: ${user.registered ? "Yes" : "No"}
└────···
`.trim();
        
        reply(caption);
    }
};