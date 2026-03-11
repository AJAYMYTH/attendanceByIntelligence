const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, attendanceController.recordAttendance);
router.get('/analytics', authenticateToken, attendanceController.getAnalytics);
router.get('/report', authenticateToken, attendanceController.downloadReport);

module.exports = router;
