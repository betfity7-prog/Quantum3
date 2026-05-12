const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class SessionEncoder {
    constructor() {
        this.chunkSize = 3500; // Telegram message limit with safety margin
    }

    // Encode session folder to compressed Base64
    async encodeSession(sessionDir) {
        try {
            if (!fs.existsSync(sessionDir)) {
                throw new Error(`Session directory not found: ${sessionDir}`);
            }

            console.log(`📦 Encoding session: ${sessionDir}`);

            // Read all files in session directory
            const files = this.readDirectoryRecursive(sessionDir);
            const sessionData = {
                timestamp: Date.now(),
                files: {}
            };

            // Read each file content
            for (const filePath of files) {
                const relativePath = path.relative(sessionDir, filePath);
                const content = fs.readFileSync(filePath, 'utf8');
                sessionData.files[relativePath] = content;
            }

            // Convert to JSON and compress
            const jsonData = JSON.stringify(sessionData);
            const compressed = await gzip(jsonData);
            const base64Data = compressed.toString('base64');

            console.log(`✅ Session encoded: ${base64Data.length} chars, ${files.length} files`);
            return base64Data;

        } catch (error) {
            console.error('❌ Session encoding error:', error);
            throw error;
        }
    }

    // Decode Base64 back to session files
    async decodeSession(base64Data, targetDir) {
        try {
            console.log(`📦 Decoding session to: ${targetDir}`);

            // Ensure target directory exists
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            // Decompress and parse
            const compressed = Buffer.from(base64Data, 'base64');
            const jsonBuffer = await gunzip(compressed);
            const sessionData = JSON.parse(jsonBuffer.toString());

            // Recreate files
            for (const [filePath, content] of Object.entries(sessionData.files)) {
                const fullPath = path.join(targetDir, filePath);
                const dir = path.dirname(fullPath);
                
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(fullPath, content, 'utf8');
            }

            console.log(`✅ Session decoded: ${Object.keys(sessionData.files).length} files restored`);
            return true;

        } catch (error) {
            console.error('❌ Session decoding error:', error);
            throw error;
        }
    }

    // Split data into Telegram-friendly chunks
    splitIntoChunks(data) {
        const chunks = [];
        for (let i = 0; i < data.length; i += this.chunkSize) {
            chunks.push(data.slice(i, i + this.chunkSize));
        }
        return chunks;
    }

    // Combine chunks back into complete data
    combineChunks(chunks) {
        return chunks.join('');
    }

    // Read all files in directory recursively
    readDirectoryRecursive(dir) {
        const files = [];
        
        function read(dir) {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    read(fullPath);
                } else {
                    files.push(fullPath);
                }
            }
        }
        
        read(dir);
        return files;
    }

    // Validate session directory
    isValidSession(dir) {
        if (!fs.existsSync(dir)) return false;
        
        try {
            const files = this.readDirectoryRecursive(dir);
            return files.some(file => file.includes('creds') || file.includes('app-state'));
        } catch (error) {
            return false;
        }
    }
}

module.exports = new SessionEncoder();