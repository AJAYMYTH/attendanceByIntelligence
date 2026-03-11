const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', authenticateToken, studentController.getStudents);
router.post('/upload', authenticateToken, authorizeAdmin, upload.single('file'), studentController.uploadStudents);
router.post('/manual', authenticateToken, authorizeAdmin, studentController.addStudentManual);
router.delete('/:id', authenticateToken, authorizeAdmin, studentController.deleteStudent);
router.post('/bulk-delete', authenticateToken, authorizeAdmin, studentController.bulkDeleteStudents);

module.exports = router;
