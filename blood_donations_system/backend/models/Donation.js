const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  // Donor Information
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorName: {
    type: String,
    required: true
  },
  donorPhone: {
    type: String,
    required: true
  },
  donorEmail: {
    type: String,
    required: true
  },
  donorBloodType: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  
  // Request Information (if donation is for a specific request)
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    default: null
  },
  isForSpecificRequest: {
    type: Boolean,
    default: false
  },
  
  // Donation Details
  donationType: {
    type: String,
    required: [true, 'Donation type is required'],
    enum: ['whole_blood', 'red_cells', 'platelets', 'plasma'],
    default: 'whole_blood'
  },
  bloodUnits: {
    type: Number,
    required: [true, 'Number of blood units is required'],
    min: [1, 'At least 1 unit is required'],
    max: [2, 'Maximum 2 units per donation']
  },
  
  // Medical Information (only required when donation starts, not when scheduling)
  preDonationHealthCheck: {
    bloodPressure: {
      systolic: { type: Number, required: false },
      diastolic: { type: Number, required: false }
    },
    heartRate: {
      type: Number,
      required: false,
      min: [40, 'Heart rate too low'],
      max: [120, 'Heart rate too high']
    },
    temperature: {
      type: Number,
      required: false,
      min: [35, 'Temperature too low'],
      max: [38, 'Temperature too high']
    },
    hemoglobin: {
      type: Number,
      required: false,
      min: [12, 'Hemoglobin level too low for donation']
    },
    weight: {
      type: Number,
      required: false,
      min: [50, 'Weight too low for donation']
    },
    isEligible: {
      type: Boolean,
      required: false
    },
    healthCheckNotes: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Donation Process (only required when donation starts, not when scheduling)
  donationProcess: {
    startTime: {
      type: Date,
      required: false
    },
    endTime: Date,
    duration: Number, // in minutes
    phlebotomist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectionSite: {
      type: String,
      required: false
    },
    collectionMethod: {
      type: String,
      enum: ['manual', 'automated'],
      default: 'manual'
    },
    complications: [{
      type: String,
      description: String,
      severity: {
        type: String,
        enum: ['minor', 'moderate', 'severe']
      },
      resolved: {
        type: Boolean,
        default: false
      }
    }],
    notes: String
  },
  
  // Post-Donation Care
  postDonationCare: {
    recoveryTime: Number, // in minutes
    postDonationSymptoms: [{
      symptom: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      },
      duration: Number, // in minutes
      treatment: String
    }],
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date,
    followUpNotes: String
  },
  
  // Testing and Processing
  bloodTesting: {
    isTested: {
      type: Boolean,
      default: false
    },
    testResults: {
      hiv: { type: String, enum: ['negative', 'positive', 'pending'] },
      hepatitisB: { type: String, enum: ['negative', 'positive', 'pending'] },
      hepatitisC: { type: String, enum: ['negative', 'positive', 'pending'] },
      syphilis: { type: String, enum: ['negative', 'positive', 'pending'] },
      malaria: { type: String, enum: ['negative', 'positive', 'pending'] }
    },
    testDate: Date,
    testedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isSuitableForTransfusion: {
      type: Boolean,
      default: null
    }
  },
  
  // Storage and Distribution
  storage: {
    storageLocation: String,
    storageTemperature: Number,
    storageDate: Date,
    expiryDate: Date,
    batchNumber: String,
    isStored: {
      type: Boolean,
      default: false
    }
  },
  
  // Distribution
  distribution: {
    isDistributed: {
      type: Boolean,
      default: false
    },
    distributedTo: {
      hospitalName: String,
      hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      distributedDate: Date,
      distributedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      patientName: String,
      patientId: String
    }
  },
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'tested', 'stored', 'distributed', 'discarded', 'cancelled'],
    default: 'scheduled'
  },
  
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  collectionSite: {
    type: String,
    required: true
  },
  actualDate: Date,
  actualTime: String,
  
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
  
  // Quality Control
  qualityControl: {
    isPassed: {
      type: Boolean,
      default: null
    },
    qualityCheckDate: Date,
    qualityCheckBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    qualityNotes: String,
    rejectionReason: String
  },
  
  // Impact Tracking
  impact: {
    livesSaved: {
      type: Number,
      default: 0
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    usedDate: Date,
    usedFor: String
  },
  
  // Feedback
  donorFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    wouldDonateAgain: Boolean,
    feedbackDate: Date
  },
  
  // Additional Information
  additionalNotes: String,
  attachments: [{
    filename: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Recipient Responses (recipient feedback/confirmation about donation)
  recipientResponses: [{
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    response: { type: String, enum: ['accept', 'decline'], required: true },
    notes: { type: String },
    respondedAt: { type: Date, default: Date.now }
  }],

  // Medical admin review of recipient response
  recipientReview: {
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    notes: { type: String },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
donationSchema.index({ donorId: 1, createdAt: -1 });
donationSchema.index({ requestId: 1 });
donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ scheduledDate: 1 });
donationSchema.index({ 'bloodTesting.isSuitableForTransfusion': 1 });
donationSchema.index({ requestId: 1, 'recipientResponses.recipientId': 1 });

// Virtual for donation duration
donationSchema.virtual('donationDuration').get(function() {
  if (this.donationProcess.startTime && this.donationProcess.endTime) {
    return Math.round((this.donationProcess.endTime - this.donationProcess.startTime) / (1000 * 60));
  }
  return null;
});

// Virtual for days until expiry
donationSchema.virtual('daysUntilExpiry').get(function() {
  if (this.storage.expiryDate) {
    const now = new Date();
    const expiry = new Date(this.storage.expiryDate);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for is expired
donationSchema.virtual('isExpired').get(function() {
  if (this.storage.expiryDate) {
    return new Date() > this.storage.expiryDate;
  }
  return false;
});

// Pre-save middleware to calculate duration
donationSchema.pre('save', function(next) {
  if (this.donationProcess.startTime && this.donationProcess.endTime) {
    this.donationProcess.duration = Math.round(
      (this.donationProcess.endTime - this.donationProcess.startTime) / (1000 * 60)
    );
  }
  next();
});

// Method to start donation process
donationSchema.methods.startDonation = function(phlebotomistId, collectionSite) {
  this.status = 'in_progress';
  this.donationProcess.startTime = new Date();
  this.donationProcess.phlebotomist = phlebotomistId;
  this.donationProcess.collectionSite = collectionSite;
  this.actualDate = new Date();
  this.actualTime = new Date().toTimeString().split(' ')[0];
  
  return this.save();
};

// Method to complete donation
donationSchema.methods.completeDonation = function(endTime, notes) {
  this.status = 'completed';
  this.donationProcess.endTime = endTime || new Date();
  this.donationProcess.notes = notes;
  
  return this.save();
};

// Method to update test results
donationSchema.methods.updateTestResults = function(testResults, testedBy) {
  this.bloodTesting.isTested = true;
  this.bloodTesting.testResults = testResults;
  this.bloodTesting.testDate = new Date();
  this.bloodTesting.testedBy = testedBy;
  
  // Check if all tests are negative
  const allNegative = Object.values(testResults).every(result => result === 'negative');
  this.bloodTesting.isSuitableForTransfusion = allNegative;
  
  if (allNegative) {
    this.status = 'tested';
  } else {
    this.status = 'discarded';
  }
  
  return this.save();
};

// Method to store blood
donationSchema.methods.storeBlood = function(storageLocation, batchNumber, expiryDate) {
  this.storage.isStored = true;
  this.storage.storageLocation = storageLocation;
  this.storage.batchNumber = batchNumber;
  this.storage.expiryDate = expiryDate;
  this.storage.storageDate = new Date();
  this.status = 'stored';
  
  return this.save();
};

// Method to distribute blood
donationSchema.methods.distributeBlood = function(hospitalInfo, patientInfo, distributedBy) {
  this.distribution.isDistributed = true;
  this.distribution.distributedTo = {
    ...hospitalInfo,
    ...patientInfo,
    distributedDate: new Date(),
    distributedBy
  };
  this.status = 'distributed';
  this.impact.isUsed = true;
  this.impact.usedDate = new Date();
  this.impact.livesSaved = this.bloodUnits;
  
  return this.save();
};

// Method to add donor feedback
donationSchema.methods.addDonorFeedback = function(rating, comments, wouldDonateAgain) {
  this.donorFeedback = {
    rating,
    comments,
    wouldDonateAgain,
    feedbackDate: new Date()
  };
  
  return this.save();
};

// Static method to get donation statistics
donationSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        completedDonations: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        suitableForTransfusion: {
          $sum: { $cond: [{ $eq: ['$bloodTesting.isSuitableForTransfusion', true] }, 1, 0] }
        },
        totalUnits: { $sum: '$bloodUnits' },
        totalLivesSaved: { $sum: '$impact.livesSaved' },
        averageRating: { $avg: '$donorFeedback.rating' }
      }
    }
  ]);
  
  return stats[0] || {
    totalDonations: 0,
    completedDonations: 0,
    suitableForTransfusion: 0,
    totalUnits: 0,
    totalLivesSaved: 0,
    averageRating: 0
  };
};

// Static method to get donor statistics
donationSchema.statics.getDonorStatistics = async function(donorId) {
  const stats = await this.aggregate([
    { $match: { donorId: mongoose.Types.ObjectId(donorId) } },
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalUnits: { $sum: '$bloodUnits' },
        totalLivesSaved: { $sum: '$impact.livesSaved' },
        lastDonationDate: { $max: '$createdAt' },
        averageRating: { $avg: '$donorFeedback.rating' }
      }
    }
  ]);
  
  return stats[0] || {
    totalDonations: 0,
    totalUnits: 0,
    totalLivesSaved: 0,
    lastDonationDate: null,
    averageRating: 0
  };
};

module.exports = mongoose.model('Donation', donationSchema);
