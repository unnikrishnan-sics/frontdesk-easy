const Submission = require('../models/Submission');

/**
 * Archive submissions older than 30 days
 */
const archiveOldSubmissions = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Update submissions older than 30 days that are not already archived
    const result = await Submission.updateMany(
      {
        createdAt: { $lt: thirtyDaysAgo },
        status: { $ne: 'archived' }
      },
      {
        $set: { status: 'archived' }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`[Auto-Archive Service] Archived ${result.modifiedCount} submissions older than 30 days.`);
    } else {
      console.log('[Auto-Archive Service] No old submissions to archive.');
    }
  } catch (error) {
    console.error('[Auto-Archive Service] Error running auto-archive job:', error);
  }
};

/**
 * Start the archive service cron-like schedule
 */
const startArchiveService = () => {
  // Run once immediately on startup
  archiveOldSubmissions();
  
  // Run every 24 hours (24 * 60 * 60 * 1000 ms)
  setInterval(() => {
    archiveOldSubmissions();
  }, 24 * 60 * 60 * 1000);
};

module.exports = {
  archiveOldSubmissions,
  startArchiveService
};
