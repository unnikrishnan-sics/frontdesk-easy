const AuditLog = require('../models/AuditLog');

/**
 * @desc    Get audit logs (paginated)
 * @route   GET /api/logs
 * @access  Private (Super Admin)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { userEmail: new RegExp(search, 'i') },
        { action: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
