const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

const setNoCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

router.get('/status/:section', authenticateToken, authorizeAdmin, setNoCache, whatsappController.getStatus);
router.get('/qr/:section', authenticateToken, authorizeAdmin, setNoCache, whatsappController.getQR);
router.post('/pair/:section', authenticateToken, authorizeAdmin, whatsappController.pairPhone);
router.post('/logout/:section', authenticateToken, authorizeAdmin, whatsappController.logout);

module.exports = router;
