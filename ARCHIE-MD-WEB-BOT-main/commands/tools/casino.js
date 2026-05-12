// commands/tools/casino.js
module.exports = {
    name: 'casino',
    category: 'tools',
    description: 'Casino gambling game',
    permission: 'all',
    aliases: ['gamble'],
    async execute(context) {
        const { m, sock, args, isGroup, reply } = context;
        if (!isGroup) return reply("This command only works in groups");
        
        function pickRandom(list) {
            return list[Math.floor(Math.random() * list.length)];
        }
        
        if (sock.casino && sock.casino[m.chat]) {
            return reply("Someone is still playing casino here, please wait until finished!");
        } else {
            if (!sock.casino) sock.casino = {};
            sock.casino[m.chat] = true;
        }
        
        try {
            let randomPlayer = `${Math.floor(Math.random() * 101)}`.trim();
            let randomBot = `${Math.floor(Math.random() * 81)}`.trim();
            let playerPoints = randomPlayer * 1;
            let botPoints = randomBot * 1;
            let betAmount = args[0];
            
            betAmount = betAmount ? /all/i.test(betAmount) ? Math.floor(((global.db.users[m.sender]?.exp || 100)) / 1) : parseInt(betAmount) : args[0] ? parseInt(args[0]) : 1;
            betAmount = Math.max(1, betAmount);
            
            if (args.length < 1) return reply("casino <amount>\nExample: casino 1000");
            
            let userExp = global.db.users[m.sender]?.exp || 100;
            if (userExp >= betAmount * 1) {
                global.db.users[m.sender].exp -= betAmount * 1;
                
                if (playerPoints > botPoints) {
                    reply(`💰 Casino 💰\n*You:* ${playerPoints} Points\n*Computer:* ${botPoints} Points\n\n*You LOSE*\nYou lost ${betAmount} coins`);
                } else if (playerPoints < botPoints) {
                    global.db.users[m.sender].exp += betAmount * 2;
                    reply(`💰 Casino 💰\n*You:* ${playerPoints} Points\n*Computer:* ${botPoints} Points\n\n*You WIN*\nYou won ${betAmount * 2} coins`);
                } else {
                    global.db.users[m.sender].exp += betAmount * 1;
                    reply(`💰 Casino 💰\n*You:* ${playerPoints} Points\n*Computer:* ${botPoints} Points\n\n*DRAW*\nYou got ${betAmount * 1} coins back`);
                }
            } else {
                reply(`You don't have enough coins for Casino!`);
            }
        } catch (e) {
            console.log(e);
            reply("Error in casino game!");
        } finally {
            delete sock.casino[m.chat];
        }
    }
};