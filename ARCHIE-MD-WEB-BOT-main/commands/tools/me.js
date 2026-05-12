// commands/tools/me.js
module.exports = {
    name: 'me',
    category: 'tools',
    description: 'Show user profile',
    permission: 'all',
    aliases: ['inventory'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        if (!m.isGroup) return reply("This command only works in groups");
        
        let who = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.sender;
        let user = global.db.users[who] || { 
            name: "User", level: 1, money: 0, exp: 0, health: 100, limit: 10, registered: false 
        };
        
        let caption = `
👤 *USER PROFILE*
Name: ${user.registered ? user.name : "User"}
Level: ${user.level || 1}
Money: ${user.money || 0}
Exp: ${user.exp || 0}

💼 *INVENTORY*
- Health: ${user.health || 100}
- Limit: ${user.limit || 10}
- Registered: ${user.registered ? "Yes" : "No"}

🏆 *STATUS*
Regular User - Archie MD RPG
`.trim();
        
        reply(caption);
    }
};