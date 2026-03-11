const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const supabase = require('./supabase');

class WhatsAppManager {
    constructor() {
        this.clients = {}; // Map of section_name -> { client, qr, status, expiry }
        this.sections = ['1st Year DAIML', '2nd Year DAIML', '3rd Year DAIML'];
    }

    async initializeAll() {
        console.log('Initializing WhatsApp Manager for all sections...');
        for (const section of this.sections) {
            try {
                await this.initClient(section);
            } catch (err) {
                console.error(`Failed to start WhatsApp client for ${section}:`, err.message);
            }
        }
    }

    async initClient(section) {
        if (this.clients[section]) return this.clients[section];

        const clientId = section.replace(/\s+/g, '-').toLowerCase();
        console.log(`[WhatsApp] Initializing client for: ${section} (ID: ${clientId})`);

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: clientId }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-extensions',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote'
                ]
            }
        });

        this.clients[section] = {
            client,
            qr: null,
            status: 'INITIALIZING',
            expiry: null,
            qrTimestamp: null,
            pairingCode: null
        };

        client.on('qr', async (qr) => {
            if (this.clients[section].qr === qr) return; // Ignore identical QR

            console.log(`[WhatsApp] QR received for section: ${section}`);
            this.clients[section].qr = qr;
            this.clients[section].status = 'QR_READY';
            this.clients[section].qrTimestamp = Date.now();
            this.clients[section].pairingCode = null; // Clear pairing code if QR is shown
        });

        client.on('code', (code) => {
            console.log(`[WhatsApp] Pairing code received for ${section}: ${code}`);
            this.clients[section].pairingCode = code;
            this.clients[section].status = 'PAIRING_READY';
        });

        client.on('ready', async () => {
            console.log(`WhatsApp Client for ${section} is ready!`);
            this.clients[section].status = 'READY';
            this.clients[section].qr = null;

            // Set 7-day expiry from now
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 7);
            this.clients[section].expiry = expiry;

            await supabase
                .from('section_settings')
                .update({
                    last_auth_date: new Date().toISOString(),
                    session_expiry: expiry.toISOString()
                })
                .eq('section_name', section);
        });

        client.on('authenticated', () => {
            console.log(`[WhatsApp] ${section} authenticated.`);
            this.clients[section].status = 'AUTHENTICATED';
        });

        client.on('auth_failure', (msg) => {
            console.error(`Auth failure for ${section}:`, msg);
            this.clients[section].status = 'AUTH_FAILURE';
        });

        client.on('disconnected', (reason) => {
            console.log(`[WhatsApp] Disconnected for ${section}:`, reason);
            this.clients[section].status = 'DISCONNECTED';
            this.clients[section].expiry = null;
            this.clients[section].qr = null;
        });

        client.on('loading_screen', (percent, message) => {
            console.log(`[WhatsApp] ${section} loading: ${percent}% - ${message}`);
            this.clients[section].status = 'LOADING';
        });

        client.on('change_state', (state) => {
            console.log(`[WhatsApp] ${section} state change: ${state}`);
        });

        const maxRetries = 3;
        let attempt = 0;

        const startInitialization = async () => {
            try {
                attempt++;
                console.log(`[WhatsApp] Initializing client for ${section} (Attempt ${attempt}/${maxRetries})...`);
                await client.initialize();

                // Manually expose the function if not already there (fix for "window.onCodeReceivedEvent is not a function")
                // We do this after initialization to ensure pupPage is available
                if (client.pupPage) {
                    try {
                        await client.pupPage.exposeFunction('onCodeReceivedEvent', (code) => {
                            client.emit('code', code);
                            return code; // Return back to browser context
                        });
                    } catch (e) {
                        // Function might already be exposed, ignore
                    }
                }
            } catch (err) {
                console.error(`[WhatsApp] Initialization failed for ${section} (Attempt ${attempt}):`, err.message);

                // Special handling for browser lock on Windows
                if (err.message.includes('browser is already running') || err.message.includes('locked')) {
                    console.log(`[WhatsApp] Session lock detected for ${section}. Attempting to force cleanup...`);
                    // There's not much we can do safely to the file system during runtime, 
                    // but we can try to wait longer or ask for manual intervention if it persists.
                    attempt--; // Don't count lock errors as retries if they are transient? 
                    // Actually, better to just retry normally with a longer delay.
                }

                if (attempt < maxRetries) {
                    console.log(`[WhatsApp] Retrying in 5 seconds...`);
                    setTimeout(startInitialization, 5000);
                } else {
                    this.clients[section].status = 'FAILED';
                }
            }
        };

        startInitialization();

        return this.clients[section];
    }

    async sendMessage(section, to, message) {
        const clientInfo = this.clients[section];
        if (!clientInfo || clientInfo.status !== 'READY') {
            console.warn(`Client for ${section} not ready. Falling back to default if available.`);
            // Optional: fallback to a default client if needed
            return;
        }

        try {
            let chatId = to;
            if (!chatId.includes('@')) {
                chatId = chatId.replace(/\D/g, '');
                if (chatId.length === 10) chatId = '91' + chatId;
                chatId = `${chatId}@c.us`;
            }
            await clientInfo.client.sendMessage(chatId, message);
            console.log(`Message sent from ${section} to ${chatId}`);
        } catch (err) {
            console.error(`Failed to send message from ${section}:`, err.message);
        }
    }

    getStatus(section) {
        return this.clients[section] || { status: 'NOT_FOUND' };
    }

    async getPairingCode(section, phone) {
        const clientInfo = this.clients[section];
        if (!clientInfo || !clientInfo.client) throw new Error('Client not initialized');

        // Guard for Puppeteer page existence (fix for evaluate of null error)
        if (!clientInfo.client.pupPage) {
            console.error(`[WhatsApp] pupPage is null for ${section}. Browser might still be launching.`);
            throw new Error('Browser not ready. Please wait a few seconds or ensure Port 5000 is clean.');
        }

        console.log(`[WhatsApp] Requesting pairing code for ${section} with phone ${phone}`);
        try {
            return await clientInfo.client.requestPairingCode(phone);
        } catch (err) {
            console.error(`[WhatsApp] requestPairingCode failed:`, err.message);
            throw err;
        }
    }
}

const manager = new WhatsAppManager();
module.exports = manager;
