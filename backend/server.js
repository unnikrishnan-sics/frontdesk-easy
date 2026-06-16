const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Load env variables
dotenv.config();

// Connect to database
const connectDB = require('./config/db');
connectDB();

// Route files
const authRoutes = require('./routes/auth');
const submissionRoutes = require('./routes/submissions');
const analyticsRoutes = require('./routes/analytics');
const logRoutes = require('./routes/logs');

// Controllers / Services for startup
const { seedDefaultAdmin } = require('./controllers/authController');
const { startArchiveService } = require('./services/archiveService');
const errorHandler = require('./middleware/error');

const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Bind Socket.io globally to request object
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log(`New socket connection: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Seed default admin
seedDefaultAdmin();

// Start auto-archive daemon
startArchiveService();

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(mongoSanitize());
app.use(xss());

// Rate limiting (max 100 requests per 15 minutes per IP for general API)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 200,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// Enable CORS
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory serving
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/logs', logRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Centralized error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
