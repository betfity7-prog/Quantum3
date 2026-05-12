// commands/tools/repair.js
module.exports = {
    name: 'repair',
    category: 'tools',
    description: 'Repair tools and equipment',
    permission: 'all',
    aliases: ['fix'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        
        if (!m.isGroup) return reply("This command only works in groups");
        
        let toolType = (args[0] || "").toLowerCase();
        let user = global.db.users[m.sender] || {
            pickaxedurability: 0, pickaxe: 0, diamond: 0, rock: 0, wood: 0, iron: 0,
            sworddurability: 0, sword: 0, gold: 0,
            fishingroddurability: 0, fishingrod: 0, string: 0,
            armordurability: 0, armor: 0
        };
        
        let repairInfo = `
🔧 *REPAIR SYSTEM*
- Pickaxe ⛏️
- Sword ⚔️
- Fishingrod 🎣
- Armor 🥼

*RECIPES*
Pickaxe: 20 Rock, 20 Wood, 20 Iron, 1 Diamond
Sword: 20 Wood, 20 Iron, 2 Gold, 1 Diamond
FishingRod: 20 Wood, 20 String, 20 Iron, 1 Diamond
Armor: 15 Iron, 2 Gold, 1 Diamond

*Usage:* repair <toolname>
`.trim();

        if (!toolType) return reply(repairInfo);
        
        try {
            switch (toolType) {
                case "pickaxe":
                    if (user.pickaxedurability > 99) return reply("This tool doesn't need repair");
                    if (user.pickaxe == 0) return reply("You don't have this tool");
                    if (user.diamond < 1 || user.rock < 20 || user.wood < 20 || user.iron < 20) return reply(`Not enough materials!`);
                    user.rock -= 20; user.wood -= 20; user.iron -= 20; user.diamond -= 1;
                    user.pickaxedurability = 100;
                    reply("Successfully repaired pickaxe! - Archie MD");
                    break;
                    
                case "sword":
                    if (user.sworddurability > 99) return reply("This tool doesn't need repair");
                    if (user.sword == 0) return reply("You don't have this tool");
                    if (user.diamond < 1 || user.wood < 20 || user.iron < 20 || user.gold < 2) return reply(`Not enough materials!`);
                    user.wood -= 20; user.iron -= 20; user.gold -= 2; user.diamond -= 1;
                    user.sworddurability = 100;
                    reply("Successfully repaired sword! - Archie MD");
                    break;
                    
                case "fishingrod":
                    if (user.fishingroddurability > 99) return reply("This tool doesn't need repair");
                    if (user.fishingrod == 0) return reply("You don't have this tool");
                    if (user.diamond < 1 || user.string < 20 || user.wood < 20 || user.iron < 20) return reply(`Not enough materials!`);
                    user.wood -= 20; user.string -= 20; user.iron -= 20; user.diamond -= 1;
                    user.fishingroddurability = 100;
                    reply("Successfully repaired fishing rod! - Archie MD");
                    break;
                    
                case "armor":
                    if (user.armordurability > 99) return reply("This tool doesn't need repair");
                    if (user.armor == 0) return reply("You don't have this tool");
                    if (user.diamond < 1 || user.iron < 15 || user.gold < 2) return reply(`Not enough materials!`);
                    user.iron -= 15; user.gold -= 2; user.diamond -= 1;
                    user.armordurability = 100;
                    reply("Successfully repaired armor! - Archie MD");
                    break;
                    
                default:
                    return reply(repairInfo);
            }
        } catch (err) {
            reply("Error in repair system: " + err.message);
        }
    }
};