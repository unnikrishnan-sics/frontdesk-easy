const Submission = require('../models/Submission');

/**
 * @desc    Get dashboard summary statistics
 * @route   GET /api/analytics/stats
 * @access  Private (Admin)
 */
const getStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Total Requests Today
    const todaySubmissions = await Submission.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    let totalRequestsToday = 0;
    todaySubmissions.forEach(sub => {
      totalRequestsToday += sub.students.length;
    });

    // 2. Aggregate counts across all submissions (excluding archived)
    const activeSubmissions = await Submission.find({ status: { $ne: 'archived' } });

    let pendingRequests = 0;
    let approvedRequests = 0;
    let rejectedRequests = 0;
    let printedPasses = 0;
    let totalActivePasses = 0;
    let todaysVisitors = 0;

    const now = new Date();

    activeSubmissions.forEach(sub => {
      sub.students.forEach(student => {
        if (student.status === 'pending') pendingRequests++;
        if (student.status === 'approved') approvedRequests++;
        if (student.status === 'rejected') rejectedRequests++;
        if (student.passGenerated) printedPasses++;

        // Active pass check: approved/printed and within valid window
        if (
          student.status === 'approved' &&
          student.validFrom <= now &&
          student.validTo >= now
        ) {
          totalActivePasses++;
        }

        // Today's visitors: approved/printed and validity covers today
        if (
          student.status === 'approved' &&
          student.validFrom <= tomorrow &&
          student.validTo >= today
        ) {
          todaysVisitors++;
        }
      });
    });

    res.status(200).json({
      success: true,
      data: {
        totalRequestsToday,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        printedPasses,
        totalActivePasses,
        todaysVisitors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get visitor trends (daily count for last 7/30 days)
 * @route   GET /api/analytics/trends
 * @access  Private (Admin)
 */
const getTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const limitDays = parseInt(days);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limitDays);
    startDate.setHours(0, 0, 0, 0);

    const submissions = await Submission.find({
      createdAt: { $gte: startDate },
      status: { $ne: 'archived' }
    });

    // Generate date map
    const trendMap = {};
    for (let i = 0; i <= limitDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap[dateStr] = { date: dateStr, submissions: 0, visitors: 0 };
    }

    submissions.forEach(sub => {
      const dateStr = sub.createdAt.toISOString().split('T')[0];
      if (trendMap[dateStr]) {
        trendMap[dateStr].submissions += 1;
        trendMap[dateStr].visitors += sub.students.length;
      }
    });

    const trendData = Object.values(trendMap);

    res.status(200).json({
      success: true,
      data: trendData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly analytics reports for current year
 * @route   GET /api/analytics/monthly-reports
 * @access  Private (Admin)
 */
const getMonthlyReports = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const submissions = await Submission.find({
      createdAt: { $gte: startOfYear, $lte: endOfYear }
    });

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyData = months.map((month, index) => ({
      month,
      submissions: 0,
      visitors: 0,
      approved: 0
    }));

    submissions.forEach(sub => {
      const monthIndex = sub.createdAt.getMonth();
      monthlyData[monthIndex].submissions += 1;
      
      sub.students.forEach(student => {
        monthlyData[monthIndex].visitors += 1;
        if (student.status === 'approved') {
          monthlyData[monthIndex].approved += 1;
        }
      });
    });

    res.status(200).json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getTrends,
  getMonthlyReports
};
