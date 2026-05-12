module.exports = {
    name: 'delowner',
    category: 'owner',
    description: 'Remove owner',
    permission: 'owner',
    aliases: ['removeowner'],
    async execute(context) {
        const { m, sock, reply, args, db, isCreator } = context;
        
        if (!isCreator) return reply('❌ Only main owner can remove other owners!');
        if (!args[0]) return reply('📝 Example: .delowner 62xxx\nOr mention the user');

        let targetJid;
        
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetJid = m.mentionedJid[0];
        } else {
            const number = args[0].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        // Prevent removing yourself
        if (targetJid === m.sender) {
            return reply('❌ You cannot remove yourself as owner!');
        }

        if (!db.users || !db.users[targetJid]) {
            return reply('❌ User not found in database!');
        }

        // Downgrade to regular user
        db.users[targetJid].premium = false;
        db.users[targetJid].limit = 10;
        db.users[targetJid].role = 'user';
        delete db.users[targetJid].addedBy;
        delete db.users[targetJid].addedAt;

        // Remove from global owners
        if (global.owner && Array.isArray(global.owner)) {
            const ownerNumber = targetJid.split('@')[0];
            global.owner = global.owner.filter(num => num !== ownerNumber);
        }

        await reply(`✅ *OWNER REMOVED*\n\n📞 User: ${targetJid}\n⚡ Status: Regular User\n📊 Limit: 10`);

        // Notify removed owner
        try {
            await sock.sendMessage(targetJid, {
                text: `ℹ️ *OWNERSHIP UPDATE*\n\nYour owner privileges have been removed.\n\nYou now have regular user access with 10 command limits.\n\nContact main owner for questions.`
            });
        } catch (error) {
            console.log('Could not notify removed owner:', error.message);
        }
    }
};