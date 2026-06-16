const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/logController');

router.get('/', protect, authorize('super_admin'), getAuditLogs);

module.exports = router;
