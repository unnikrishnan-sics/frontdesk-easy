const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  uploadPhoto,
  registerSubmission,
  getSubmissions,
  updateSubmissionStatus,
  updateStudentStatus,
  bulkActionSubmissions,
  updateStudentPhoto
} = require('../controllers/submissionController');

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max size
});

// Public Routes (Student Portal)
router.post('/upload-photo', upload.single('photo'), uploadPhoto);
router.post('/register', registerSubmission);

// Private Routes (Admin Dashboard)
router.get('/', protect, getSubmissions);
router.post('/bulk-action', protect, bulkActionSubmissions);
router.put('/:id/status', protect, updateSubmissionStatus);
router.put('/:id/students/:studentId/status', protect, updateStudentStatus);
router.put('/:id/students/:studentId/photo', protect, updateStudentPhoto);

module.exports = router;
