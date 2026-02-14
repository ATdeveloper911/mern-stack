require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const slowDown = require('express-slow-down');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bloodRequestRoutes = require('./routes/bloodRequests');
const donationRoutes = require('./routes/donations');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const auditRoutes = require('./routes/audit');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const auditLogger = require('./middleware/auditLogger');
const logger = require('./utils/logger');

const app = express();
const server = createServer(app);

// Socket.IO setup for real-time features
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize socket handlers
const { initializeSocket } = require('./socket/socketHandler');
initializeSocket(io);

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiter for additional protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 50
});

app.use(limiter);
app.use(speedLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Audit logging middleware
app.use(auditLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BloodLink API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO connection handling is now managed by socketHandler.js

// Global error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Database connection
const connectDB = async () => {
  try {
    logger.info('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://awais:awais123456@cluster0.slr4sml.mongodb.net/blood_donation?appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Set up database indexes
    logger.info('Setting up database indexes...');
    await setupDatabaseIndexes();
    logger.info('Database setup completed successfully');
    
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

// Setup database indexes for performance
const setupDatabaseIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // User indexes - handle existing indexes gracefully
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
    } catch (error) {
      if (error.code !== 85) { // Index already exists
        logger.warn('Email index creation warning:', error.message);
      }
    }
    
    try {
      // Drop existing phone index if it exists and recreate as unique
      await db.collection('users').dropIndex('phone_1').catch(() => {}); // Ignore if doesn't exist
      await db.collection('users').createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'phone_unique' });
    } catch (error) {
      if (error.code !== 85) { // Index already exists
        logger.warn('Phone index creation warning:', error.message);
      }
    }
    
    try {
      await db.collection('users').createIndex({ location: '2dsphere' }, { name: 'location_2dsphere' });
    } catch (error) {
      if (error.code !== 85) {
        logger.warn('Location index creation warning:', error.message);
      }
    }
    
    try {
      await db.collection('users').createIndex({ bloodType: 1, isAvailable: 1 }, { name: 'bloodType_availability' });
    } catch (error) {
      if (error.code !== 85) {
        logger.warn('Blood type index creation warning:', error.message);
      }
    }
    
    // Blood request indexes
    try {
      await db.collection('bloodrequests').createIndex({ bloodType: 1, status: 1 }, { name: 'bloodType_status' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Blood request bloodType index warning:', error.message);
    }
    
    try {
      await db.collection('bloodrequests').createIndex({ location: '2dsphere' }, { name: 'bloodrequest_location' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Blood request location index warning:', error.message);
    }
    
    try {
      await db.collection('bloodrequests').createIndex({ urgency: 1, createdAt: -1 }, { name: 'urgency_created' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Blood request urgency index warning:', error.message);
    }
    
    try {
      await db.collection('bloodrequests').createIndex({ requesterId: 1, createdAt: -1 }, { name: 'requester_created' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Blood request requester index warning:', error.message);
    }
    
    // Donation indexes
    try {
      await db.collection('donations').createIndex({ donorId: 1, createdAt: -1 }, { name: 'donor_created' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Donation donor index warning:', error.message);
    }
    
    try {
      await db.collection('donations').createIndex({ requestId: 1 }, { name: 'donation_request' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Donation request index warning:', error.message);
    }
    
    try {
      await db.collection('donations').createIndex({ status: 1, createdAt: -1 }, { name: 'donation_status' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Donation status index warning:', error.message);
    }
    
    // Notification indexes
    try {
      await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 }, { name: 'notification_user' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Notification user index warning:', error.message);
    }
    
    try {
      await db.collection('notifications').createIndex({ type: 1, createdAt: -1 }, { name: 'notification_type' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Notification type index warning:', error.message);
    }
    
    // Audit trail indexes
    try {
      await db.collection('audittrails').createIndex({ userId: 1, createdAt: -1 }, { name: 'audit_user' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Audit user index warning:', error.message);
    }
    
    try {
      await db.collection('audittrails').createIndex({ action: 1, createdAt: -1 }, { name: 'audit_action' });
    } catch (error) {
      if (error.code !== 85) logger.warn('Audit action index warning:', error.message);
    }
    
    try {
      await db.collection('audittrails').createIndex({ createdAt: -1 }, { 
        expireAfterSeconds: parseInt(process.env.AUDIT_RETENTION_DAYS || '90') * 24 * 60 * 60,
        name: 'audit_expiry'
      });
    } catch (error) {
      if (error.code !== 85) logger.warn('Audit expiry index warning:', error.message);
    }
    
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error setting up database indexes:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    mongoose.connection.close();
  });
});

// Start server
const PORT = process.env.PORT || 5000; // Server port

connectDB().then(() => {
  try {
    logger.info('Starting HTTP server...');
    
    // Add error handling for server.listen
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
    
    server.listen(PORT, () => {
      logger.info(`BloodLink server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
    logger.info('Server startup initiated successfully');
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}).catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
