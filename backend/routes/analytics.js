const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getStats,
  getTrends,
  getMonthlyReports
} = require('../controllers/analyticsController');

router.get('/stats', protect, getStats);
router.get('/trends', protect, getTrends);
router.get('/monthly-reports', protect, getMonthlyReports);

module.exports = router;
