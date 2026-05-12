module.exports = {
    name: 'addowner',
    category: 'owner',
    description: 'Add additional owner',
    permission: 'owner',
    aliases: ['addadmin'],
    async execute(context) {
        const { m, sock, reply, args, db, isCreator } = context;
        
        if (!isCreator) return reply('❌ Only main owner can add other owners!');
        if (!args[0]) return reply('📝 Example: .addowner 62xxx\nOr mention the user');

        let targetJid;
        
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetJid = m.mentionedJid[0];
        } else {
            const number = args[0].replace(/[^0-9]/g, '');
            targetJid = number + '@s.whatsapp.net';
        }

        // Verify user exists on WhatsApp
        try {
            const [user] = await sock.onWhatsApp(targetJid);
            if (!user || !user.exists) {
                return reply('❌ User not found on WhatsApp!');
            }
        } catch (error) {
            console.log('WhatsApp verification failed:', error);
        }

        // Add to database
        if (!db.users) db.users = {};
        db.users[targetJid] = {
            name: '',
            premium: true,
            limit: 9999,
            role: 'owner',
            addedBy: m.sender,
            addedAt: new Date().toISOString()
        };

        // Add to global owners array
        if (!global.owner) global.owner = [];
        if (Array.isArray(global.owner)) {
            const ownerNumber = targetJid.split('@')[0];
            if (!global.owner.includes(ownerNumber)) {
                global.owner.push(ownerNumber);
            }
        }

        await reply(`✅ *NEW OWNER ADDED*\n\n👑 User: ${targetJid}\n⚡ Status: Full Owner Access\n🎯 Limit: Unlimited`);

        // Welcome message to new owner
        try {
            await sock.sendMessage(targetJid, {
                text: `🎉 *WELCOME TO THE OWNER TEAM!*\n\nYou are now a *BOT OWNER*! 🚀\n\n✨ Owner Privileges:\n• Full bot control\n• Unlimited commands\n• Add/remove users\n• Change bot mode\n• Access all features\n\nUse *.help owner* to see owner commands.`
            });
        } catch (error) {
            console.log('Could not notify new owner:', error.message);
        }
    }
};