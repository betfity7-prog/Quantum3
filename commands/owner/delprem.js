module.exports = {
    name: 'delprem',
    category: 'owner',
    description: 'Remove premium user',
    permission: 'owner',
    aliases: ['delpremium', 'removeprem'],
    async execute(context) {
        const { m, sock, reply, args, db, isCreator } = context;
        
        if (!isCreator) return reply('❌ Owner only command!');
        if (args.length < 1) return reply('📝 Example: .delprem 62xxx\nOr mention the user');

        let targetJid;
        
        // Check if mentioned user or number provided
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetJid = m.mentionedJid[0];
        } else {
            const number = args[0].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        if (!db.users || !db.users[targetJid]) {
            return reply('❌ User not found in database!');
        }

        // Remove premium status
        db.users[targetJid].premium = false;
        db.users[targetJid].limit = 10;
        db.users[targetJid].role = 'user';
        delete db.users[targetJid].premiumExpiry;
        delete db.users[targetJid].premiumAdded;

        await reply(`✅ *PREMIUM REMOVED*\n\n📞 User: ${targetJid}\n⭐ Status: Regular User\n📊 Limit: 10`);

        // Notify user
        try {
            await sock.sendMessage(targetJid, {
                text: `ℹ️ *PREMIUM STATUS UPDATE*\n\nYour premium membership has ended.\n\nYou can still use basic features with 10 command limits.\n\nContact owner to renew premium. 📞`
            });
        } catch (error) {
            console.log('Could not notify user:', error.message);
        }
    }
};