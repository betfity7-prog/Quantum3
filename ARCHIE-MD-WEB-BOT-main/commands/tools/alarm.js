// commands/tools/alarm.js
module.exports = {
    name: 'alarm',
    category: 'tools',
    description: 'Set alarm timer',
    permission: 'all',
    aliases: ['timer'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        
        let command = args[0];
        if (command === "set") {
            let time = args[1];
            reply(`Alarm set for ${time} - Archie MD Alarm`);
        } else if (command === "off") {
            reply(`Alarm turned off - Archie MD`);
        } else {
            reply(`Available options: set, off\nExample: alarm set 08:00`);
        }
    }
};