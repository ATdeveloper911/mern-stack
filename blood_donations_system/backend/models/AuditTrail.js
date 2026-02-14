const mongoose = require('mongoose');

const auditTrailSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['donor', 'recipient', 'medical_admin', 'system_admin', 'anonymous']
  },
  
  // Action Information
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      // Authentication actions
      'login', 'logout', 'register', 'password_reset', 'email_verification',
      
      // User actions
      'profile_update', 'profile_picture_update', 'profile_view', 'password_change', 'settings_update',
      
      // Blood request actions
      'blood_request_create', 'blood_request_update', 'blood_request_delete', 'blood_request_view',
      'blood_request_match', 'blood_request_confirm', 'blood_request_complete', 'blood_request_cancel',
      
      // Donation actions
      'donation_schedule', 'donation_start', 'donation_complete', 'donation_cancel',
      'donation_test', 'donation_store', 'donation_distribute',
      
      // Notification actions
      'notification_send', 'notification_read', 'notification_delete',
      
      // Admin actions
      'user_create', 'user_update', 'user_delete', 'user_block', 'user_unblock',
      'system_config_update', 'data_export', 'data_import', 'backup_create',
      
      // Medical actions
      'medical_verification', 'health_check', 'test_result_update',
      
      // Security actions
      'security_alert', 'suspicious_activity', 'access_denied', 'permission_change'
    ]
  },
  
  // Resource Information
  resourceType: {
    type: String,
    required: true,
    enum: ['user', 'blood_request', 'donation', 'notification', 'system', 'medical_record', 'authentication']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  
  // Request Information
  requestId: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    default: null
  },
  
  // Action Details
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Data Changes
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  
  // Status and Result
  status: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    default: null
  },
  
  // Location Information
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    }
  },
  
  // Additional Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Risk Assessment
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  isSuspicious: {
    type: Boolean,
    default: false
  },
  suspiciousReason: {
    type: String,
    default: null
  },
  
  // Compliance
  complianceFlags: [{
    type: String,
    enum: ['gdpr', 'hipaa', 'sox', 'pci', 'iso27001']
  }],
  
  // Retention
  retentionPeriod: {
    type: Number,
    default: 2555 // 7 years in days
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
auditTrailSchema.index({ userId: 1, createdAt: -1 });
auditTrailSchema.index({ action: 1, createdAt: -1 });
auditTrailSchema.index({ resourceType: 1, resourceId: 1 });
auditTrailSchema.index({ ipAddress: 1, createdAt: -1 });
auditTrailSchema.index({ riskLevel: 1, createdAt: -1 });
auditTrailSchema.index({ isSuspicious: 1, createdAt: -1 });
auditTrailSchema.index({ createdAt: -1 }, { expireAfterSeconds: 2555 * 24 * 60 * 60 }); // 7 years

// Virtual for time ago
auditTrailSchema.virtual('timeAgo').get(function() {
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

// Virtual for risk score
auditTrailSchema.virtual('riskScore').get(function() {
  const riskScores = { low: 1, medium: 2, high: 3, critical: 4 };
  return riskScores[this.riskLevel] || 1;
});

// Method to mark as suspicious
auditTrailSchema.methods.markAsSuspicious = function(reason) {
  this.isSuspicious = true;
  this.suspiciousReason = reason;
  this.riskLevel = 'high';
  return this.save();
};

// Method to update risk level
auditTrailSchema.methods.updateRiskLevel = function(level, reason = null) {
  this.riskLevel = level;
  if (reason) {
    this.suspiciousReason = reason;
    this.isSuspicious = level === 'high' || level === 'critical';
  }
  return this.save();
};

// Static method to log action
auditTrailSchema.statics.logAction = async function(data) {
  const auditEntry = new this({
    userId: data.userId,
    userEmail: data.userEmail,
    userRole: data.userRole,
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    requestId: data.requestId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    sessionId: data.sessionId,
    description: data.description,
    changes: data.changes,
    status: data.status || 'success',
    errorMessage: data.errorMessage,
    location: data.location,
    metadata: data.metadata || {},
    riskLevel: data.riskLevel || 'low'
  });
  
  return await auditEntry.save();
};

// Static method to get user activity
auditTrailSchema.statics.getUserActivity = async function(userId, limit = 50) {
  return await this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('action description status createdAt riskLevel');
};

// Static method to get suspicious activities
auditTrailSchema.statics.getSuspiciousActivities = async function(limit = 100) {
  return await this.find({
    $or: [
      { isSuspicious: true },
      { riskLevel: { $in: ['high', 'critical'] } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('userId', 'firstName lastName email role');
};

// Static method to get security alerts
auditTrailSchema.statics.getSecurityAlerts = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    action: { $in: ['security_alert', 'suspicious_activity', 'access_denied'] },
    createdAt: { $gte: startDate }
  })
  .sort({ createdAt: -1 })
  .populate('userId', 'firstName lastName email role');
};

// Static method to get compliance report
auditTrailSchema.statics.getComplianceReport = async function(startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          resourceType: '$resourceType',
          riskLevel: '$riskLevel'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        action: '$_id.action',
        resourceType: '$_id.resourceType',
        riskLevel: '$_id.riskLevel',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to cleanup old entries
auditTrailSchema.statics.cleanupOldEntries = async function() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 2555); // 7 years
  
  return await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('AuditTrail', auditTrailSchema);
