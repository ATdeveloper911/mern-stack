const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const travelHubRoutes = require('./routes/travelHubRoutes');
const placesToStayRoutes = require('./routes/placesToStayRoutes');
const moneyMapRoutes = require('./routes/moneyMapRoutes');
const travelFundRoutes = require('./routes/travelFundRoutes');
const travelMapRoutes = require('./routes/travelMapRoutes');
const buddyBotRoutes = require('./routes/buddyBotRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Block API calls until MongoDB is connected (but allow health check)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection not available. Please start MongoDB and try again.'
    });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/travel-hub', travelHubRoutes);
app.use('/api/places-to-stay', placesToStayRoutes);
app.use('/api/money-map', moneyMapRoutes);
app.use('/api/travel-fund', travelFundRoutes);
app.use('/api/travel-map', travelMapRoutes);
app.use('/api/buddy-bot', buddyBotRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

module.exports = app;
