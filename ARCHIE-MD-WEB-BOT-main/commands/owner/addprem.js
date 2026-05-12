module.exports = {
    name: 'addprem',
    category: 'owner',
    description: 'Add premium user with duration',
    permission: 'owner',
    aliases: ['addpremium'],
    async execute(context) {
        const { m, sock, reply, args, db, isCreator } = context;
        
        if (!isCreator) return reply('❌ Owner only command!');
        if (args.length < 2) return reply('📝 Example: .addprem 62xxx 30d\n💡 Add "d" for days or "m" for months');

        let targetJid, duration = args[1];
        
        // Check if mentioned user or number provided
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetJid = m.mentionedJid[0];
        } else {
            // Clean number and add @s.whatsapp.net
            const number = args[0].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        // Parse duration
        let days = 30; // Default
        if (duration.endsWith('d')) {
            days = parseInt(duration);
        } else if (duration.endsWith('m')) {
            days = parseInt(duration) * 30;
        } else {
            days = parseInt(duration) || 30;
        }

        const expiryDate = Date.now() + (days * 24 * 60 * 60 * 1000);

        // Initialize user in database
        if (!db.users) db.users = {};
        db.users[targetJid] = {
            name: '',
            premium: true,
            limit: 50,
            role: 'premium',
            premiumAdded: new Date().toISOString(),
            premiumExpiry: expiryDate,
            addedBy: m.sender
        };

        await reply(`✅ *PREMIUM USER ADDED*\n\n📞 User: ${targetJid}\n⭐ Status: Premium\n⏰ Duration: ${days} days\n📅 Expires: ${new Date(expiryDate).toLocaleDateString()}`);

        // Send notification to user
        try {
            await sock.sendMessage(targetJid, {
                text: `🎉 *CONGRATULATIONS!*\n\nYou are now a *PREMIUM MEMBER*!\n\n✨ Benefits:\n• Higher limits\n• Premium features\n• Priority access\n\n⏰ Expires: ${new Date(expiryDate).toLocaleDateString()}\n\nThank you for your support! 💖`
            });
        } catch (error) {
            console.log('Could not notify user:', error.message);
        }
    }
};