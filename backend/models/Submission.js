const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true // index student names for fast sub-document searching
  },
  photoUrl: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  passGenerated: {
    type: Boolean,
    default: false
  },
  validFrom: {
    type: Date,
    default: null
  },
  validTo: {
    type: Date,
    default: null
  },
  printedAt: {
    type: Date,
    default: null
  }
});

const submissionSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    groupName: {
      type: String,
      default: null,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'partially_approved', 'archived'],
      default: 'pending',
      index: true
    },
    students: [studentSchema]
  },
  {
    timestamps: true
  }
);

// Compound indexes if needed, e.g. status + createdAt for dashboard aggregation
submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
