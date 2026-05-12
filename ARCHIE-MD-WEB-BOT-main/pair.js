const readline = require('readline');
const chalk = require('chalk');
const { broadcastStatus } = require('./server.js');

class PairingSystem {
    constructor() {
        this.pairingCode = null;
        this.qrCode = null;
    }

    async inputNumber(promptText) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log(chalk.cyan("╔══════════════════════════════════╗"));
        console.log(chalk.cyan("║         PHONE NUMBER INPUT       ║"));
        console.log(chalk.cyan("╚══════════════════════════════════╝"));
        
        return new Promise((resolve) => {
            rl.question(chalk.yellow("✨ ") + chalk.white(promptText), (answer) => {
                rl.close();
                const cleaned = answer.replace(/[^0-9]/g, "");
                resolve(cleaned || "254");
            });
        });
    }

    async requestPairingCode(sock, phoneNumber) {
        try {
            console.log(chalk.blue("📱 Requesting pairing code for:"), phoneNumber);
            const code = await sock.requestPairingCode(phoneNumber);
            this.pairingCode = code;
            global.pairingCode = code;
            
            console.log(chalk.magenta("╔══════════════════════════════════╗"));
            console.log(chalk.magenta("║           PAIRING CODE           ║"));
            console.log(chalk.magenta("╚══════════════════════════════════╝"));
            console.log(chalk.cyan("🔐 PAIRING CODE: ") + chalk.yellow(code));
            console.log(chalk.green("✅ Go to WhatsApp → Linked Devices → Link a Device"));
            
            // Broadcast to web clients
            broadcastStatus('pairing', `Waiting for pairing with code: ${code}`);
            
            return code;
        } catch (error) {
            console.log(chalk.red("❌ Failed to get pairing code:"), error.message);
            broadcastStatus('error', `Pairing failed: ${error.message}`);
            throw error;
        }
    }

    generateQRCode(qr) {
        this.qrCode = qr;
        global.qrCode = qr;
        
        console.log(chalk.magenta("╔══════════════════════════════════╗"));
        console.log(chalk.magenta("║              QR CODE             ║"));
        console.log(chalk.magenta("╚══════════════════════════════════╝"));
        console.log(chalk.cyan("📱 Scan this QR code with WhatsApp"));
        
        broadcastStatus('qr-waiting', 'Scan QR code to connect');
    }

    clearCodes() {
        this.pairingCode = null;
        this.qrCode = null;
        global.pairingCode = null;
        global.qrCode = null;
    }
}

module.exports = new PairingSystem();