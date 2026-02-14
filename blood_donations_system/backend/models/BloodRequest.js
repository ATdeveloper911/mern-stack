const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  // Requester Information
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  requesterPhone: {
    type: String,
    required: true
  },
  requesterEmail: {
    type: String,
    required: true
  },
  
  // Patient Information
  patientName: {
    type: String,
    required: [true, 'Patient name is required']
  },
  patientAge: {
    type: Number,
    required: [true, 'Patient age is required'],
    min: [0, 'Age cannot be negative'],
    max: [120, 'Age cannot exceed 120']
  },
  patientGender: {
    type: String,
    required: [true, 'Patient gender is required'],
    enum: ['male', 'female', 'other']
  },
  patientBloodType: {
    type: String,
    required: [true, 'Patient blood type is required'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  
  // Medical Information
  hospitalName: {
    type: String,
    required: [true, 'Hospital name is required']
  },
  hospitalAddress: {
    type: String,
    required: [true, 'Hospital address is required']
  },
  hospitalPhone: {
    type: String,
    required: [true, 'Hospital phone is required']
  },
  doctorName: {
    type: String,
    required: [true, 'Doctor name is required']
  },
  doctorPhone: {
    type: String,
    required: [true, 'Doctor phone is required']
  },
  medicalReason: {
    type: String,
    required: [true, 'Medical reason is required'],
    enum: ['surgery', 'accident', 'disease', 'childbirth', 'cancer', 'other']
  },
  medicalReasonDescription: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Blood Requirements
  bloodType: {
    type: String,
    required: [true, 'Blood type is required'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  bloodUnits: {
    type: Number,
    required: [true, 'Number of blood units is required'],
    min: [1, 'At least 1 unit is required'],
    max: [10, 'Maximum 10 units per request']
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['whole_blood', 'red_cells', 'platelets', 'plasma']
  },
  
  // Urgency and Timeline
  urgency: {
    type: String,
    required: [true, 'Urgency level is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  requiredBy: {
    type: Date,
    required: [true, 'Required by date is required']
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  
  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  
  // Request Status
  status: {
    type: String,
    enum: ['pending', 'matched', 'confirmed', 'in_progress', 'fulfilled', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  
  // Matching Information
  matchedDonors: [{
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    donorName: String,
    donorPhone: String,
    matchedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed'],
      default: 'pending'
    },
    responseTime: Number, // in minutes
    notes: String
  }],
  
  // Confirmed Donation
  confirmedDonor: {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    donorName: String,
    donorPhone: String,
    confirmedAt: Date,
    donationDate: Date,
    donationTime: String,
    donationLocation: String
  },
  
  // Completion Information
  completedAt: Date,
  actualUnitsReceived: {
    type: Number,
    default: 0
  },
  completionNotes: String,
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  verificationNotes: String,
  
  // Statistics
  viewCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  responseCount: {
    type: Number,
    default: 0
  },
  
  // Additional Information
  additionalNotes: {
    type: String,
    maxlength: [1000, 'Additional notes cannot exceed 1000 characters']
  },
  attachments: [{
    filename: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Expiry
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 7 days from creation
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bloodRequestSchema.index({ requesterId: 1, createdAt: -1 });
bloodRequestSchema.index({ bloodType: 1, status: 1 });
bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ urgency: 1, createdAt: -1 });
bloodRequestSchema.index({ status: 1, createdAt: -1 });
bloodRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time remaining
bloodRequestSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'completed' || this.status === 'fulfilled' || this.status === 'cancelled') return null;
  const now = new Date();
  const requiredBy = new Date(this.requiredBy);
  const diff = requiredBy - now;
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0; // days
});

// Virtual for is expired
bloodRequestSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt || new Date() > this.requiredBy;
});

// Virtual for urgency score
bloodRequestSchema.virtual('urgencyScore').get(function() {
  const urgencyScores = { low: 1, medium: 2, high: 3, critical: 4 };
  return urgencyScores[this.urgency] || 2;
});

// Pre-save middleware to update status based on expiry
bloodRequestSchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

// Method to find compatible blood types
bloodRequestSchema.methods.getCompatibleBloodTypes = function() {
  const compatibility = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-']
  };
  
  return compatibility[this.bloodType] || [];
};

// Method to add matched donor
bloodRequestSchema.methods.addMatchedDonor = function(donorId, donorName, donorPhone) {
  const existingMatch = this.matchedDonors.find(match => 
    match.donorId.toString() === donorId.toString()
  );
  
  if (!existingMatch) {
    this.matchedDonors.push({
      donorId,
      donorName,
      donorPhone,
      matchedAt: new Date(),
      status: 'pending'
    });
    this.responseCount += 1;
    
    if (this.status === 'pending') {
      this.status = 'matched';
    }
  }
  
  return this.save();
};

// Method to confirm donor
bloodRequestSchema.methods.confirmDonor = function(donorId, donationDate, donationTime, donationLocation) {
  const matchedDonor = this.matchedDonors.find(match => 
    match.donorId.toString() === donorId.toString()
  );
  
  if (matchedDonor) {
    this.confirmedDonor = {
      donorId: matchedDonor.donorId,
      donorName: matchedDonor.donorName,
      donorPhone: matchedDonor.donorPhone,
      confirmedAt: new Date(),
      donationDate,
      donationTime,
      donationLocation
    };
    
    this.status = 'confirmed';
    matchedDonor.status = 'accepted';
  }
  
  return this.save();
};

// Method to complete request
bloodRequestSchema.methods.completeRequest = function(actualUnits, notes) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.actualUnitsReceived = actualUnits;
  this.completionNotes = notes;
  
  if (this.confirmedDonor) {
    const confirmedMatch = this.matchedDonors.find(match => 
      match.donorId.toString() === this.confirmedDonor.donorId.toString()
    );
    if (confirmedMatch) {
      confirmedMatch.status = 'completed';
    }
  }
  
  return this.save();
};

// Static method to find nearby requests
bloodRequestSchema.statics.findNearby = function(coordinates, maxDistance = 50000, bloodType = null) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    status: { $in: ['pending', 'matched'] },
    expiresAt: { $gt: new Date() }
  };
  
  if (bloodType) {
    query.bloodType = bloodType;
  }
  
  return this.find(query).sort({ urgency: -1, createdAt: -1 });
};

// Static method to get statistics
bloodRequestSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        completedRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        criticalRequests: {
          $sum: { $cond: [{ $eq: ['$urgency', 'critical'] }, 1, 0] }
        },
        averageResponseTime: { $avg: '$responseTime' }
      }
    }
  ]);
  
  return stats[0] || {
    totalRequests: 0,
    completedRequests: 0,
    pendingRequests: 0,
    criticalRequests: 0,
    averageResponseTime: 0
  };
};

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
