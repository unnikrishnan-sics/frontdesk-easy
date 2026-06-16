const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // only need createdAt for logs
  }
);

// Auto-expire logs or simple indexing
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
