const whatsappManager = require('../utils/whatsapp');
const supabase = require('../utils/supabase');

exports.getStatus = async (req, res) => {
    const { section } = req.params;
    try {
        const info = whatsappManager.getStatus(section);

        // Fetch additional info from DB
        const { data, error } = await supabase
            .from('section_settings')
            .select('*')
            .eq('section_name', section)
            .single();

        res.json({
            status: info.status,
            qr: info.qr,
            expiry: info.expiry,
            qr_timestamp: info.qrTimestamp,
            pairing_code: info.pairingCode, // Added for potential future use
            db_info: data
        });
    } catch (err) {
        console.error(`[WhatsApp API] getStatus error for ${section}:`, err);
        res.status(500).json({ message: 'Error fetching status', error: err.message });
    }
};

exports.getQR = async (req, res) => {
    const { section } = req.params;
    const info = whatsappManager.getStatus(section);
    if (info && info.qr) {
        res.json({ qr: info.qr });
    } else {
        res.status(404).json({ message: 'QR not available for this section' });
    }
};

exports.pairPhone = async (req, res) => {
    const { section } = req.params;
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ message: 'Phone number required' });

    try {
        const clientInfo = whatsappManager.clients[section];
        if (!clientInfo || !clientInfo.client) {
            return res.status(404).json({ message: 'Client not initialized for this section' });
        }

        console.log(`[WhatsApp API] Requesting pairing code for ${section} with phone ${phone}`);
        const pairingCode = await whatsappManager.getPairingCode(section, phone);

        if (!pairingCode) {
            console.warn(`[WhatsApp API] Manager returned empty pairing code for ${section}`);
            return res.status(500).json({ message: 'Failed to generate pairing code: Empty response' });
        }

        res.json({ pairingCode });
    } catch (err) {
        console.error(`[WhatsApp API] pairing error for ${section}:`, err);
        res.status(500).json({ message: 'Failed to generate pairing code', error: err.message });
    }
};

exports.logout = async (req, res) => {
    const { section } = req.params;
    try {
        const clientInfo = whatsappManager.clients[section];
        if (clientInfo && clientInfo.client) {
            await clientInfo.client.logout();
            // Re-initialize to get a new QR
            delete whatsappManager.clients[section];
            await whatsappManager.initClient(section);
        }
        res.json({ message: `Logged out from ${section}` });
    } catch (err) {
        res.status(500).json({ message: 'Logout failed', error: err.message });
    }
};
