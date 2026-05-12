// commands/tools/trackip.js
module.exports = {
    name: 'trackip',
    category: 'tools',
    description: 'Track IP address information',
    permission: 'all',
    aliases: [],
    async execute(context) {
        const { m, sock, text, args, reply, fetch } = context;
        
        if (!text) {
            const message = `Contoh: \`/trackip <ip address>\`\n/trackip 1.1.1.1`;
            return reply(message);
        }

        const [target] = args;

        if (target === '0.0.0.0') {
            return reply('Jangan Di Ulangi Manis Nanti Di Delete User Mu');
        }

        try {
            const apiKey = '8fd0a436e74f44a7a3f94edcdd71c696'; 
            const response = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${target}`);
            const res = await fetch(`https://ipwho.is/${target}`);

            if (!response.ok || !res.ok) {
                throw new Error(`Gagal mengambil data IP. Status: ${response.status} or ${res.status}`);
            }

            const additionalInfo = await res.json();
            const ipInfo = await response.json();

            if (!ipInfo || typeof ipInfo !== 'object' || Object.keys(ipInfo).length === 0) {
                throw new Error('Data dari api.ipgeolocation.io tidak valid.');
            }
            if (!additionalInfo || typeof additionalInfo !== 'object' || Object.keys(additionalInfo).length === 0) {
                throw new Error('Data dari ipwho.is tidak valid');
            }

            const message = `Informasi IP untuk ${target}:\n` +
                `- Flags: ${ipInfo.country_flag || 'N/A'}\n` + 
                `- Country: ${ipInfo.country_name || 'N/A'}\n` +
                `- Capital: ${ipInfo.country_capital || 'N/A'}\n` +
                `- City: ${ipInfo.city || 'N/A'}\n` +
                `- ISP: ${ipInfo.isp || 'N/A'}\n` +
                `- Organization: ${ipInfo.organization || 'N/A'}\n` +
                `- Latitude: ${ipInfo.latitude || 'N/A'}\n` +
                `- Longitude: ${ipInfo.longitude || 'N/A'}\n\n` +
                `Google Maps: https://www.google.com/maps/place/${additionalInfo.latitude || ''}+${additionalInfo.longitude || ''}`;

            return reply(message);
            
        } catch (error) {
            console.error(`Error melacak ${target}:`, error);
            return reply(`Error melacak ${target}. Silakan coba lagi nanti. Error: ${error.message}`);
        }
    }
};