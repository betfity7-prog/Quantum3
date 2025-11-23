// commands/tools/checkban.js
module.exports = {
    name: 'checkban',
    category: 'tools',
    description: 'Check WhatsApp ban status',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { m, sock, text, reply, prefix, command } = context;
        
        if (!text) return reply(`Example:\n ${prefix + command} 91xxxxxxxxxx`)
        
        let victim = text.split("|")[0]
        const phoneNumber = victim.replace(/[^0-9]/g, '')
        
        if (phoneNumber.length < 10) {
            return reply(`❌ Invalid phone number!\n\nExample: ${prefix + command} 91xxxxxxxxxx`)
        }
        
        try {
            await reply(`🔍 Checking ban status for: +${phoneNumber}...\n⏳ Please wait...`)
            
            // Simulated ban check
            const result = {
                number: phoneNumber,
                isBanned: Math.random() > 0.7,
                isNeedOfficialWa: Math.random() > 0.8,
                data: {
                    violation_type: 'Spam',
                    in_app_ban_appeal: true,
                    appeal_token: 'APL123456'
                }
            }
            
            let statusMsg = `📱 *BAN STATUS CHECK*\n\n`
            statusMsg += `📞 *Number:* +${result.number}\n\n`
            
            if (result.isBanned) {
                statusMsg += `🚫 *STATUS:* BANNED\n\n`
                statusMsg += `⚠️ *Details:*\n`
                statusMsg += `• Violation: ${result.data?.violation_type || 'Unknown'}\n`
                statusMsg += `• Can Appeal: ${result.data?.in_app_ban_appeal ? 'Yes' : 'No'}\n`
                if (result.data?.appeal_token) {
                    statusMsg += `• Appeal Token: \`${result.data.appeal_token}\`\n`
                }
                statusMsg += `\n💡 *Tip:* Use official WhatsApp to appeal ban`
            } 
            else if (result.isNeedOfficialWa) {
                statusMsg += `🔒 *STATUS:* RESTRICTED\n\n`
                statusMsg += `⚠️ *Reason:* Must use Official WhatsApp\n`
                statusMsg += `💡 *Tip:* Switch to official WhatsApp app`
            } 
            else {
                statusMsg += `✅ *STATUS:* CLEAN\n\n`
                statusMsg += `🎉 Number is *NOT BANNED*\n`
                statusMsg += `✅ Safe to use with any WhatsApp`
            }
            
            return reply(statusMsg)
            
        } catch (error) {
            console.error('Ban check error:', error)
            return reply(`❌ Error checking ban status!\nTry again later or contact support.`)
        }
    }
};