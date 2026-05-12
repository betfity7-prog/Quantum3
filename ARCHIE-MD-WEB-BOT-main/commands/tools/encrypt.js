const JsConfuser = require('js-confuser');

module.exports = {
    name: 'encrypt',
    category: 'tools',
    description: 'Encrypt JavaScript files with high security',
    aliases: ['enc'],
    permission: 'all',
    async execute(context) {
        const { m, sock, reply } = context;
        
        if (!m.quoted || !m.quoted.message) {
            return reply('ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ғɪʟᴇ ᴛᴏ ʙᴇ ᴇɴᴄʀʏᴘᴛᴇᴅ.');
        }
        
        const quotedMessage = m.quoted.message;
        const quotedDocument = quotedMessage.documentMessage;
        
        if (!quotedDocument || !quotedDocument.fileName.endsWith('.js')) {
            return reply('ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ғɪʟᴇ ᴛᴏ ʙᴇ ᴇɴᴄʀʏᴘᴛᴇᴅ.');
        }
        
        try {
            const fileName = quotedDocument.fileName;
            const docBuffer = await m.quoted.download();
            
            if (!docBuffer) {
                return reply('ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ғɪʟᴇ ᴛᴏ ʙᴇ ᴇɴᴄʀʏᴘᴛᴇᴅ.');
            }
            
            await sock.sendMessage(m.chat, { react: { text: '🕛', key: m.key } });
            
            const obfuscatedCode = await JsConfuser.obfuscate(docBuffer.toString(), {
                target: "node",
                preset: "high",
                compact: true,
                minify: true,
                flatten: true,
                identifierGenerator: function () {
                    const originalString = "素KING晴SHADOW晴" + "素KING晴SHADOW晴";
                    const removeUnwantedChars = (input) => input.replace(/[^a-zA-Z素KING晴SHADOW晴]/g, "");
                    const randomString = (length) => {
                        let result = "";
                        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
                        for (let i = 0; i < length; i++) {
                            result += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                        return result;
                    };
                    return removeUnwantedChars(originalString) + randomString(2);
                },
                renameVariables: true,
                renameGlobals: true,
                stringEncoding: true,
                stringSplitting: 0.0,
                stringConcealing: true,
                stringCompression: true,
                duplicateLiteralsRemoval: 1.0,
                shuffle: { hash: 0.0, true: 0.0 },
                stack: true,
                controlFlowFlattening: 1.0,
                opaquePredicates: 0.9,
                deadCode: 0.0,
                dispatcher: true,
                rgf: false,
                calculator: true,
                hexadecimalNumbers: true,
                movedDeclarations: true,
                objectExtraction: true,
                globalConcealing: true,
            });
            
            await sock.sendMessage(m.chat, {
                document: Buffer.from(obfuscatedCode, 'utf-8'),
                mimetype: 'application/javascript',
                fileName: `${fileName}`,
                caption: `🪐 • sᴜᴄᴄᴇssғᴜʟ ᴇɴᴄʀʏᴘᴛ\n🪐 • ᴛʏᴘᴇ : ʜᴀʀᴅ ᴄᴏᴅᴇ\n© 𝔎𝔦𝔫𝔤 𝔖𝔥𝔮𝔡𝔬𝔴 | Powered by Archie-MD`,
            }, { quoted: m });
            
        } catch (err) {
            console.error('ᴇʀʀᴏʀ ᴅᴜʀɪɴɢ ᴇɴᴄʀʏᴘᴛɪᴏɴ:', err);
            return reply(`ᴀɴ ᴇʀʀᴏʀ ᴏᴄᴄᴜʀʀᴇᴅ: ${err.message}`);
        }
    }
};