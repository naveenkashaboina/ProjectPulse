const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const path = require('path');
const fs = require('fs');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const sprintRoutes = require('./routes/sprintRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const issueRoutes = require('./routes/issueRoutes');
const teamRoutes = require('./routes/teamRoutes');
const commentRoutes = require('./routes/commentRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const labelRoutes = require('./routes/labelRoutes');

const app = express();

// Trust reverse proxy for deployment on Render (so rate limiters read the real client IP)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins (including Vercel preview/production domains)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(mongoSanitize());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Apply general API rate limiter to all API endpoints
app.use('/api', apiLimiter);

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/labels', labelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Serve frontend bundle in production if built (enables unified single-service deployment)
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
