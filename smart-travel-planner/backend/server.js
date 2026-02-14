const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const rawMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart-travel-planner';

// On Windows, "localhost" often resolves to IPv6 (::1) which can cause ECONNREFUSED
// if MongoDB is only listening on IPv4. Normalize local URIs to IPv4.
const mongoUri = rawMongoUri.replace(/^mongodb:\/\/localhost(?=[:/])/i, 'mongodb://127.0.0.1');

if (mongoUri !== rawMongoUri) {
  console.log(`ℹ️ Normalized MongoDB URI from ${rawMongoUri} to ${mongoUri}`);
}

// Start server immediately (like finance_tracker). DB will connect in the background.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// MongoDB connection with retry (prevents dev server from crashing if Mongo isn't running yet)
const connectWithRetry = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error(`❌ Tried to connect using: ${mongoUri}`);
    console.error('� Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected');
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose error:', err.message);
});

// Start connection attempts
connectWithRetry();

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
  } catch (_) {
    // ignore
  }
  process.exit(0);
});
