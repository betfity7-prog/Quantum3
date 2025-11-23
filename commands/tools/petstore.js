// commands/tools/petstore.js
module.exports = {
    name: 'petstore',
    category: 'tools',
    description: 'Buy pets from store',
    permission: 'all',
    aliases: ['petshop'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        
        if (!m.isGroup) return reply("This command only works in groups");
        
        let petType = (args[0] || "").toLowerCase();
        let user = global.db.users[m.sender] || { pet: 0, cat: 0, dog: 0, horse: 0, fox: 0, robo: 0 };
        
        let petPrices = { dog: 2, cat: 2, horse: 4, fox: 6, robo: 10 };
        
        let petShop = `
🐾 *PET STORE - Archie MD*
🐈 Cat: ${petPrices.cat} 🪙
🐕 Dog: ${petPrices.dog} 🪙
🐎 Horse: ${petPrices.horse} 🪙
🦊 Fox: ${petPrices.fox} 🪙
🤖 Robo: ${petPrices.robo} 🪙

*Usage:* petshop <petname>
`.trim();

        if (!petType) return reply(petShop);
        
        try {
            switch (petType) {
                case "cat":
                    if (user.cat > 0) return reply("You already have this pet");
                    if (user.pet < petPrices.cat) return reply(`Not enough pet tokens`);
                    user.pet -= petPrices.cat; user.cat += 1;
                    reply("Congratulations! You got a new cat pet! 🎉 - Archie MD");
                    break;
                    
                case "dog":
                    if (user.dog > 0) return reply("You already have this pet");
                    if (user.pet < petPrices.dog) return reply(`Not enough pet tokens`);
                    user.pet -= petPrices.dog; user.dog += 1;
                    reply("Congratulations! You got a new dog pet! 🎉 - Archie MD");
                    break;
                    
                case "fox":
                    if (user.fox > 0) return reply("You already have this pet");
                    if (user.pet < petPrices.fox) return reply(`Not enough pet tokens`);
                    user.pet -= petPrices.fox; user.fox += 1;
                    reply("Congratulations! You got a new fox pet! 🎉 - Archie MD");
                    break;
                    
                case "horse":
                    if (user.horse > 0) return reply("You already have this pet");
                    if (user.pet < petPrices.horse) return reply(`Not enough pet tokens`);
                    user.pet -= petPrices.horse; user.horse += 1;
                    reply("Congratulations! You got a new horse pet! 🎉 - Archie MD");
                    break;
                    
                case "robo":
                    if (user.robo > 0) return reply("You already have this pet");
                    if (user.pet < petPrices.robo) return reply(`Not enough pet tokens`);
                    user.pet -= petPrices.robo; user.robo += 1;
                    reply("Congratulations! You got a new robot pet! 🎉 - Archie MD");
                    break;
                    
                default:
                    return reply(petShop);
            }
        } catch (err) {
            reply("Error in pet store: " + err.message);
        }
    }
};