const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notification Content
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // Notification Type
  type: {
    type: String,
    required: true,
    enum: [
      'blood_request',
      'donation_match',
      'donation_confirmed',
      'donation_completed',
      'emergency_alert',
      'system_announcement',
      'verification',
      'reminder',
      'feedback_request',
      'appointment',
      'medical_update',
      'security_alert'
    ]
  },
  
  // Priority and Urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  
  // Related Data
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  relatedType: {
    type: String,
    enum: ['blood_request', 'donation', 'user', 'system'],
    default: null
  },
  
  // Action Information
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionType: {
    type: String,
    enum: ['view', 'respond', 'confirm', 'decline', 'complete', 'verify'],
    default: null
  },
  actionUrl: {
    type: String,
    default: null
  },
  
  // Delivery Channels
  channels: {
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      error: String
    },
    inApp: {
      sent: { type: Boolean, default: true },
      sentAt: { type: Date, default: Date.now }
    }
  },
  
  // Read Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Expiry
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Additional Data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Sender Information
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sentBySystem: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Virtual for is expired
notificationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

// Method to update delivery status
notificationSchema.methods.updateDeliveryStatus = function(channel, status, error = null) {
  if (this.channels[channel]) {
    this.channels[channel].delivered = status === 'delivered';
    this.channels[channel].deliveredAt = status === 'delivered' ? new Date() : null;
    this.channels[channel].error = error;
  }
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this({
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type,
    priority: data.priority || 'medium',
    isUrgent: data.isUrgent || false,
    relatedId: data.relatedId,
    relatedType: data.relatedType,
    actionRequired: data.actionRequired || false,
    actionType: data.actionType,
    actionUrl: data.actionUrl,
    sentBy: data.sentBy,
    sentBySystem: data.sentBySystem !== false,
    metadata: data.metadata || {}
  });
  
  return await notification.save();
};

// Static method to send to multiple users
notificationSchema.statics.sendToMultipleUsers = async function(userIds, data) {
  const notifications = userIds.map(userId => ({
    ...data,
    userId
  }));
  
  return await this.insertMany(notifications);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    $and: [
      { userId },
      { isRead: false },
      {
        $or: [
          { expiresAt: { $gt: new Date() } },
          { expiresAt: { $exists: false } },
          { expiresAt: null }
        ]
      }
    ]
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to get notifications by type
notificationSchema.statics.getByType = async function(userId, type, limit = 20) {
  return await this.find({
    userId,
    type,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('relatedId', 'name email phone');
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = async function() {
  return await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
