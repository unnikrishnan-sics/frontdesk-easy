const Submission = require('../models/Submission');
const AuditLog = require('../models/AuditLog');
const { uploadStream } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

/**
 * Helper to generate a unique Request ID
 * Format: SC-XXXX (4+ digit sequential number starting at 1001)
 */
const generateUniqueRequestId = async () => {
  let isUnique = false;
  let requestId = '';
  let count = await Submission.countDocuments();

  while (!isUnique) {
    const nextNum = 1001 + count;
    requestId = `SC-${nextNum}`;
    
    // Check DB just in case of race conditions
    const exists = await Submission.findOne({ requestId });
    if (!exists) {
      isUnique = true;
    } else {
      count++;
    }
  }
  return requestId;
};

/**
 * @desc    Upload student photo to Cloudinary
 * @route   POST /api/submissions/upload-photo
 * @access  Public
 */
const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
      // 1. Try uploading to Cloudinary using stream
      const uploadResult = await uploadStream(req.file.buffer, 'technopass_student_photos');
      return res.status(200).json({
        success: true,
        photoUrl: uploadResult.secure_url
      });
    } catch (cloudinaryError) {
      console.warn('Cloudinary upload failed, falling back to local server storage:', cloudinaryError.message || cloudinaryError);

      // 2. Local fallback storage
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(req.file.originalname) || '.jpg';
      const filename = `photo-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
      const filepath = path.join(uploadDir, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      const host = req.get('host');
      const localUrl = `${req.protocol}://${host}/uploads/${filename}`;

      return res.status(200).json({
        success: true,
        photoUrl: localUrl
      });
    }
  } catch (error) {
    console.error('Photo Upload Error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
};

/**
 * @desc    Submit new registration (Individual or Group)
 * @route   POST /api/submissions/register
 * @access  Public
 */
const registerSubmission = async (req, res, next) => {
  const { phoneNumber, groupName, students } = req.body;

  if (!phoneNumber || !students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid payload. Phone and students are mandatory.' });
  }

  // Validate students
  for (const stud of students) {
    if (!stud.name || !stud.photoUrl) {
      return res.status(400).json({ success: false, message: 'Each student must have a name and photo.' });
    }
  }

  try {
    const requestId = await generateUniqueRequestId();

    const submission = await Submission.create({
      requestId,
      phoneNumber,
      groupName: groupName || null,
      status: 'pending',
      students: students.map(s => ({
        name: s.name,
        photoUrl: s.photoUrl,
        status: 'pending',
        passGenerated: false
      }))
    });

    // Broadcast new submission via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_submission', submission);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      requestId,
      submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get submissions with pagination, search, and filtering
 * @route   GET /api/submissions
 * @access  Private (Admin)
 */
const getSubmissions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      dateFilter = '', // 'today' | 'tomorrow' | 'range' | 'custom'
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // 1. Filter by Status
    if (status) {
      if (status === 'printed') {
        // Find submissions where at least one student pass is printed/generated
        query['students.passGenerated'] = true;
      } else {
        query.status = status;
      }
    } else {
      // Don't show archived by default unless specifically asked
      query.status = { $ne: 'archived' };
    }

    // 2. Filter by Date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.createdAt = { $gte: today, $lt: tomorrow };
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      query.createdAt = { $gte: tomorrow, $lt: dayAfter };
    } else if (dateFilter === 'range' && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (dateFilter === 'custom' && startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(startDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    // 3. Search query — all-digit input searches BOTH requestId AND phone simultaneously
    if (search) {
      const searchStr = search.trim();
      const searchUpper = searchStr.toUpperCase();

      if (searchUpper.startsWith('SC-')) {
        // Explicit Request ID format
        query.requestId = searchUpper;
      } else if (/^\d+$/.test(searchStr)) {
        // All digits: match requestId number OR any phone containing these digits
        query.$or = [
          { requestId: `SC-${searchStr}` },
          { phoneNumber: new RegExp(searchStr) }
        ];
      } else {
        // Text: search by student name (case-insensitive)
        query['students.name'] = new RegExp(searchStr, 'i');
      }
    }

    // 4. Sort — whitelist allowed fields to prevent injection
    const allowedSortFields = ['createdAt', 'requestId', 'phoneNumber', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    // Paginate
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, submissions] = await Promise.all([
      Submission.countDocuments(query),
      Submission.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(parseInt(limit))
    ]);

    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve/Reject an entire submission group
 * @route   PUT /api/submissions/:id/status
 * @access  Private (Admin)
 */
const updateSubmissionStatus = async (req, res, next) => {
  const { status, validFrom, validTo } = req.body; // 'approved' | 'rejected'
  const submissionId = req.params.id;

  if (!['approved', 'rejected', 'archived'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Update group status
    submission.status = status;

    // Set validity dates if approved
    const fromDate = validFrom ? new Date(validFrom) : new Date();
    const toDate = validTo ? new Date(validTo) : new Date();

    submission.students = submission.students.map(student => {
      if (status !== 'archived') {
        student.status = status;
        if (status === 'approved') {
          student.validFrom = fromDate;
          student.validTo = toDate;
        }
      }
      return student;
    });

    await submission.save();

    // Log to Audit Log
    await AuditLog.create({
      userEmail: req.user.email,
      action: `${status}_submission_group`,
      details: {
        requestId: submission.requestId,
        submissionId,
        studentCount: submission.students.length
      },
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: `Group submission ${status} successfully`,
      submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve/Reject a single student inside a group
 * @route   PUT /api/submissions/:id/students/:studentId/status
 * @access  Private (Admin)
 */
const updateStudentStatus = async (req, res, next) => {
  const { status, validFrom, validTo } = req.body; // 'approved' | 'rejected'
  const { id: submissionId, studentId } = req.params;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const student = submission.students.id(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Update status
    student.status = status;
    if (status === 'approved') {
      student.validFrom = validFrom ? new Date(validFrom) : new Date();
      student.validTo = validTo ? new Date(validTo) : new Date();
    }

    // Recalculate group status
    const allApproved = submission.students.every(s => s.status === 'approved');
    const allRejected = submission.students.every(s => s.status === 'rejected');

    if (allApproved) {
      submission.status = 'approved';
    } else if (allRejected) {
      submission.status = 'rejected';
    } else {
      submission.status = 'partially_approved';
    }

    await submission.save();

    // Log to Audit Log
    await AuditLog.create({
      userEmail: req.user.email,
      action: `${status}_student`,
      details: {
        studentId,
        studentName: student.name,
        requestId: submission.requestId
      },
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: `Student status updated to ${status}`,
      submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk approve/reject/mark printed selected students
 * @route   POST /api/submissions/bulk-action
 * @access  Private (Admin)
 */
const bulkActionSubmissions = async (req, res, next) => {
  const { studentIds, action, validFrom, validTo } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No student IDs provided' });
  }

  if (!['approve', 'reject', 'mark_printed', 'archive', 'delete'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid bulk action' });
  }

  try {
    if (action === 'delete') {
      const submissions = await Submission.find({ 'students._id': { $in: studentIds } });
      const submissionIds = submissions.map(s => s._id);
      
      await Submission.deleteMany({ _id: { $in: submissionIds } });

      // Log to Audit Log
      await AuditLog.create({
        userEmail: req.user.email,
        action: 'bulk_delete',
        details: {
          count: studentIds.length,
          studentIds,
          submissionIds
        },
        ipAddress: req.ip || req.connection.remoteAddress
      });

      return res.status(200).json({
        success: true,
        message: `Bulk deleted ${submissions.length} submission groups successfully`
      });
    }

    if (action === 'archive') {
      const submissions = await Submission.find({ 'students._id': { $in: studentIds } });
      
      const savePromises = submissions.map(submission => {
        submission.status = 'archived';
        return submission.save();
      });

      await Promise.all(savePromises);

      // Log to Audit Log
      await AuditLog.create({
        userEmail: req.user.email,
        action: 'bulk_archive',
        details: {
          count: studentIds.length,
          studentIds,
          submissionIds: submissions.map(s => s._id)
        },
        ipAddress: req.ip || req.connection.remoteAddress
      });

      return res.status(200).json({
        success: true,
        message: `Bulk archived ${submissions.length} submission groups successfully`
      });
    }
    const fromDate = validFrom ? new Date(validFrom) : new Date();
    const toDate = validTo ? new Date(validTo) : new Date();
    const printedAt = new Date();

    // Fetch ALL affected submissions in a SINGLE query (avoids N+1 problem)
    const submissions = await Submission.find({ 'students._id': { $in: studentIds } });

    // Process each submission and collect save promises for parallel execution
    const savePromises = submissions.map(submission => {
      let modified = false;

      submission.students.forEach(student => {
        if (studentIds.includes(student._id.toString())) {
          modified = true;
          if (action === 'approve') {
            student.status = 'approved';
            student.validFrom = fromDate;
            student.validTo = toDate;
          } else if (action === 'reject') {
            student.status = 'rejected';
          } else if (action === 'mark_printed') {
            student.passGenerated = true;
            student.printedAt = printedAt;
          }
        }
      });

      if (!modified) return null;

      // Recalculate group status
      const allApproved = submission.students.every(s => s.status === 'approved');
      const allRejected = submission.students.every(s => s.status === 'rejected');
      if (allApproved) submission.status = 'approved';
      else if (allRejected) submission.status = 'rejected';
      else submission.status = 'partially_approved';

      return submission.save();
    }).filter(Boolean);

    // Save all modified submissions in parallel
    await Promise.all(savePromises);

    // Log to Audit Log
    await AuditLog.create({
      userEmail: req.user.email,
      action: `bulk_${action}`,
      details: {
        count: studentIds.length,
        studentIds
      },
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: `Bulk action '${action}' completed successfully for ${studentIds.length} students`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a student's photo URL after cropping
 * @route   PUT /api/submissions/:id/students/:studentId/photo
 * @access  Private (Admin)
 */
const updateStudentPhoto = async (req, res, next) => {
  const { photoUrl } = req.body;
  const { id: submissionId, studentId } = req.params;

  if (!photoUrl) {
    return res.status(400).json({ success: false, message: 'photoUrl is required' });
  }

  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const student = submission.students.id(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const oldPhotoUrl = student.photoUrl;
    student.photoUrl = photoUrl;
    await submission.save();

    // Log to Audit Log
    await AuditLog.create({
      userEmail: req.user.email,
      action: 'crop_student_photo',
      details: {
        studentId,
        studentName: student.name,
        requestId: submission.requestId,
        oldPhotoUrl,
        newPhotoUrl: photoUrl
      },
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: 'Student photo updated successfully',
      submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a submission
 * @route   DELETE /api/submissions/:id
 * @access  Private (Admin)
 */
const deleteSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    await Submission.findByIdAndDelete(req.params.id);

    // Log to Audit Log
    await AuditLog.create({
      userEmail: req.user.email,
      action: 'delete_submission',
      details: {
        requestId: submission.requestId,
        submissionId: submission._id,
        groupName: submission.groupName,
        studentCount: submission.students.length
      },
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPhoto,
  registerSubmission,
  getSubmissions,
  updateSubmissionStatus,
  updateStudentStatus,
  bulkActionSubmissions,
  updateStudentPhoto,
  deleteSubmission
};
