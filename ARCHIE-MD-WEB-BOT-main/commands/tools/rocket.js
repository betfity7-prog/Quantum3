// commands/tools/roket.js
module.exports = {
    name: 'roket',
    category: 'tools',
    description: 'Rocket mission game',
    permission: 'all',
    aliases: ['rocket'],
    async execute(context) {
        const { m, sock, reply } = context;
        
        if (!m.isGroup) return reply("This command only works in groups");
        
        let user = global.db.users[m.sender] || { 
            health: 100, lastmisi: 0, rokets: 0, name: "User", money: 0, exp: 0 
        };
        let cooldown = new Date() - user.lastmisi;
        let waitTime = 3600000 - cooldown;
        let missionCount = user.rokets;
        let timer = this.clockString(waitTime);
        let name = user.registered ? user.name : "User";
        
        if (sock.misi && sock.misi[m.sender]) {
            reply(`Please finish your current mission first`);
            return;
        }
        
        if (user.health < 80) return reply(`You need at least 80 Health`);
        
        if (new Date() - user.lastmisi > 3600000) {
            let coinReward = Math.floor(Math.random() * 10) * 100000;
            let expReward = Math.floor(Math.random() * 10) * 1000;
            
            let missionStages = [
                `🌕\n\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒\n▒▒▄▄▄▒▒▒█▒▒▒▒▄▒▒▒▒▒▒▒▒\n▒█▀█▀█▒█▀█▒▒█▀█▒▄███▄▒\n░█▀█▀█░█▀██░█▀█░█▄█▄█░\n░█▀█▀█░█▀████▀█░█▄█▄█░\n████████▀█████████████\n🚀\n\n👨‍🚀 Starting flight.... - Archie MD`,
                `🌕\n\n🚀\n▒▒▄▄▄▒▒▒█▒▒▒▒▄▒▒▒▒▒▒▒▒\n▒█▀█▀█▒█▀█▒▒█▀█▒▄███▄▒\n░█▀█▀█░█▀██░█▀█░█▄█▄█░\n░█▀█▀█░█▀████▀█░█▄█▄█░\n████████▀█████████████\n\n➕ In flight.... - Archie MD`,
                `🌕🚀\n\n▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒\n▒▒▄▄▄▒▒▒█▒▒▒▒▄▒▒▒▒▒▒▒▒\n▒█▀█▀█▒█▀█▒▒█▀█▒▄███▄▒\n░█▀█▀█░█▀██░█▀█░█▄█▄█░\n░█▀█▀█░█▀████▀█░█▄█▄█░\n████████▀█████████████\n\n➕ Arrived at destination.... - Archie MD`,
                `🌕🚀\n\n➕ Successfully Landed.... 👨‍🚀 - Archie MD`
            ];
            
            let result = `
*—[ Rocket Mission Results ${name} ]—*
➕ 💹 Coins = [ ${coinReward} ]
➕ ✨ Exp = [ ${expReward} ]
➕ 😍 Landings Completed = +1
➕ 📥 Total Previous Landings: ${missionCount}
`.trim();
            
            user.money += coinReward;
            user.exp += expReward;
            user.rokets += 1;
            user.health -= 80;
            
            if (!sock.misi) sock.misi = {};
            sock.misi[m.sender] = ["Rocket", setTimeout(() => {
                delete sock.misi[m.sender];
            }, 27000)];
            
            setTimeout(() => { reply(result); }, 27000);
            setTimeout(() => { reply(missionStages[3]); }, 25000);
            setTimeout(() => { reply(missionStages[2]); }, 20000);
            setTimeout(() => { reply(missionStages[1]); }, 15000);
            setTimeout(() => { reply(missionStages[0]); }, 10000);
            setTimeout(() => { reply(`🔍 ${name} Finding Location..... - Archie MD`); }, 0);
            
            user.lastmisi = new Date() * 1;
        } else {
            reply(`Please wait for ${timer} to complete mission again`);
        }
    },

    clockString(ms) {
        let h = Math.floor(ms / 3600000);
        let m = Math.floor(ms / 60000) % 60;
        let s = Math.floor(ms / 1000) % 60;
        return [h, m, s].map(v => v.toString().padStart(2, "0")).join(":");
    }
};