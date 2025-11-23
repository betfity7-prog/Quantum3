// commands/tools/mathquiz.js
module.exports = {
    name: 'mathquiz',
    category: 'tools',
    description: 'Math quiz game',
    permission: 'all',
    aliases: ['math'],
    async execute(context) {
        const { m, sock, args, reply } = context;
        
        if (global.mathAnswers && global.mathAnswers[m.sender.split("@")[0]]) {
            return reply("You still have an active math session");
        }
        
        let operations = ['+', '-', '*'];
        let num1 = Math.floor(Math.random() * 50) + 1;
        let num2 = Math.floor(Math.random() * 50) + 1;
        let operation = operations[Math.floor(Math.random() * operations.length)];
        
        let question = `${num1} ${operation} ${num2}`;
        let answer = eval(question);
        
        let timeLimit = 30;
        reply(`🧮 *Math Quiz - Archie MD*\n\nSolve: ${question}\n\nTime: ${timeLimit} seconds!`);
        
        global.mathAnswers[m.sender.split("@")[0]] = answer;
        
        setTimeout(() => {
            if (global.mathAnswers[m.sender.split("@")[0]]) {
                reply(`⏰ Time's up!\nAnswer: ${global.mathAnswers[m.sender.split("@")[0]]} - Archie MD`);
                delete global.mathAnswers[m.sender.split("@")[0]];
            }
        }, timeLimit * 1000);
    }
};