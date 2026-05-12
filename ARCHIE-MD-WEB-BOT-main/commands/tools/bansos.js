// commands/tools/bansos.js
module.exports = {
    name: 'bansos',
    category: 'tools',
    description: 'Get bonus money (risky)',
    permission: 'all',
    aliases: ['bonus'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        if (!m.isGroup) return reply("This command only works in groups");
        
        let user = global.db.users[m.sender] || { money: 1000, lastbansos: 0 };
        let randomSuccess = Math.floor(Math.random() * 101);
        let randomFail = Math.floor(Math.random() * 101);
        let cooldown = new Date() - user.lastbansos;
        let waitTime = 360 - cooldown;
        let timer = this.clockString(waitTime);
        
        if (user.money < 1000) return reply(`You need at least 1000 coins to use this command`);
        
        if (new Date() - user.lastbansos > 300000) {
            if (randomSuccess > randomFail) {
                user.money -= 3000000;
                user.lastbansos = new Date() * 1;
                await sock.sendMessage(m.chat, {
                    image: { url: "https://telegra.ph/file/afcf9a7f4e713591080b5.jpg" },
                    caption: `You got caught after taking bonus funds🕴️💰, And you have to pay a 3 million coin fine💵 - Archie MD`
                });
            } else if (randomSuccess < randomFail) {
                user.money += 3000000;
                user.lastbansos = new Date() * 1;
                await sock.sendMessage(m.chat, {
                    image: { url: "https://telegra.ph/file/d31fcc46b09ce7bf236a7.jpg" },
                    caption: `You successfully received bonus funds🕴️💰, And you got 3 million coins💵 - Archie MD`
                });
            } else {
                user.lastbansos = new Date() * 1;
                reply(`Sorry, you didn't get the bonus but you escaped safely🏃 - Archie MD`);
            }
        } else {
            reply(`Please wait ${timer} to claim bonus again`);
        }
    },

    clockString(ms) {
        let h = Math.floor(ms / 3600000);
        let m = Math.floor(ms / 60000) % 60;
        let s = Math.floor(ms / 1000) % 60;
        return [h, m, s].map(v => v.toString().padStart(2, "0")).join(":");
    }
};