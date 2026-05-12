
/* > Recode script give credits to›
ARCHIETECH

📝 | Created By ARCHIETECH
🖥️ | Base Ori By ARCHIETECH
📝 | Created By ARCHIETECH
📌 |Credits ARCHIETECH
📱 |Chat wa:237695727815
👑 |Github: ARCHIE-TECH
✉️ |Email: archietech@gmail.com
   Developer: 
   - ARCHIETECH (https://t.me/lopez629)
   Follow Channel Developer:
   - https://whatsapp.com/channel/0029VaYpDLx4tRrrrXsOvZ3U
   
   
   
   
   
   
   

*/

const {
  extractMessageContent,
  jidNormalizedUser,
  proto,
  delay,
  getContentType,
  areJidsSameUser,
  generateWAMessage
} = require("@whiskeysockets/baileys");
const chalk = require("chalk");
const fs = require("fs");

module.exports = (sock, k) => {
  if (!k) return k;
  let WebMessageInfo = proto.WebMessageInfo;
  
  if (k.key) {
    k.id = k.key.id;
    k.chat = k.key.remoteJid;
    k.from = k.chat.startsWith('status') ? jidNormalizedUser(k.key.participant || k.participant) : jidNormalizedUser(k.chat);
    k.isBaileys = k.id ? (k.id.startsWith('3EB0') || k.id.startsWith('B1E') || k.id.startsWith('BAE') || k.id.startsWith('3F8') || k.id.length < 32) : false;
    k.fromMe = k.key.fromMe;
    k.isGroup = k.chat.endsWith('@g.us');
    k.sender = sock.decodeJid(k.fromMe ? sock.user.id : (k.participant || k.key.participant || k.chat));
    if (k.isGroup) k.participant = sock.decodeJid(k.key.participant) || '';
  }

  if (k.message) {
    k.mtype = getContentType(k.message);
    k.prefix = ".";
    const m = k.message[k.mtype];
    k.msg = (k.mtype === 'viewOnceMessage') ? k.message[k.mtype].message[getContentType(k.message[k.mtype].message)] : m;

    k.body = k?.message?.conversation || k?.msg?.caption || k?.msg?.text ||
      (k.mtype === 'extendedTextMessage' && k.msg?.text) ||
      (k.mtype === 'buttonsResponseMessage' && k.msg?.selectedButtonId) ||
      (k.mtype === 'interactiveResponseMessage' && k.msg?.nativeFlowResponseMessage?.paramsJson && JSON.parse(k.msg.nativeFlowResponseMessage.paramsJson)?.id) ||
      (k.mtype === 'templateButtonReplyMessage' && k.msg?.selectedId) ||
      (k.mtype === 'listResponseMessage' && k.msg?.singleSelectReply?.selectedRowId) || "";

    let quoted = k.quoted = k.msg?.contextInfo?.quotedMessage || null;
    k.mentionedJid = k.msg?.contextInfo?.mentionedJid || [];

    if (quoted) {
      let quotedType = getContentType(quoted);
      k.quoted = quoted[quotedType];
      if (quotedType === 'productMessage') {
        quotedType = getContentType(k.quoted);
        k.quoted = k.quoted[quotedType];
      }
      if (typeof k.quoted === 'string') k.quoted = { text: k.quoted };
      
      if (k.quoted && k.msg?.contextInfo) {
        k.quoted.key = {
          remoteJid: k.msg.contextInfo.remoteJid || k.from,
          participant: jidNormalizedUser(k.msg.contextInfo.participant),
          fromMe: areJidsSameUser(jidNormalizedUser(k.msg.contextInfo.participant), jidNormalizedUser(sock.user.id)),
          id: k.msg.contextInfo.stanzaId
        };

        k.quoted.mtype = quotedType;
        k.quoted.chat = k.quoted.key.remoteJid;
        k.quoted.id = k.quoted.key.id;
        k.quoted.from = /g\.us|status/.test(k.quoted.chat) ? k.quoted.key.participant : k.quoted.chat;
        k.quoted.isBaileys = k.quoted.id ? (k.quoted.id.startsWith('3EB0') || k.quoted.id.startsWith('B1E') || k.quoted.id.startsWith('3F8') || k.quoted.id.startsWith('BAE') || k.quoted.id.length < 32) : false;
        k.quoted.sender = sock.decodeJid(k.quoted.key.participant);
        k.quoted.fromMe = k.quoted.sender === sock.user.id;
        k.quoted.text = k.quoted.text || k.quoted.caption || k.quoted.conversation || k.quoted.contentText || k.quoted.selectedDisplayText || k.quoted.title || '';
        k.quoted.mentionedJid = k.msg.contextInfo?.mentionedJid || [];

        const fakeObj = WebMessageInfo.fromObject({
          key: k.quoted.key,
          message: quoted,
          ...(k.isGroup ? { participant: k.quoted.sender } : {})
        });

        k.quoted.download = (saveToFile = false) => sock.downloadMediaMessage(k.quoted, k.quoted.mtype.replace(/message/i, ''), saveToFile);
      }
    }
  }

  if (k.msg?.url) k.download = (saveToFile = false) => sock.downloadMediaMessage(k.msg, k.mtype.replace(/message/i, ''), saveToFile);
  k.text = k.body;

  // Add reply method
  k.reply = async (text, options = {}) => {
    const chat = options.chat || k.chat;
    const quoted = options.quoted || k;
    const mentions = [...(text.matchAll(/@(\d{0,16})/g))].map(v => v[1] + '@s.whatsapp.net');
    
    return sock.sendMessage(chat, { 
      text: text, 
      mentions: mentions, 
      ...options 
    }, { quoted: quoted });
  };

  // Add react method
  k.React = async (emoji) => {
    try {
      await sock.sendMessage(k.chat, {
        react: {
          text: emoji,
          key: k.key
        }
      });
    } catch (error) {
      console.error('React error:', error);
    }
  };

  return k;
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.blue(">> Update File:"), chalk.black.bgWhite(__filename));
  delete require.cache[file];
  require(file);
});