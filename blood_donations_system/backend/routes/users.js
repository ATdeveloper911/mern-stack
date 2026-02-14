const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditTrail = require('../models/AuditTrail');
const Donation = require('../models/Donation');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Public endpoint to check if a system admin already exists
router.get('/system-admin-exists', async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'system_admin' });
    res.json({ success: true, data: { exists: count > 0 } });
  } catch (error) {
    logger.error('Check system admin exists error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const {
      role,
      bloodType,
      isActive,
      status,
      isVerified,
      city,
      state,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (role) filter.role = role;
    if (bloodType) filter.bloodType = bloodType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (status) {
      switch (status) {
        case 'active':
          filter.isActive = true;
          filter.isBlocked = { $ne: true };
          break;
        case 'inactive':
          filter.isActive = false;
          break;
        case 'suspended':
          filter.isBlocked = true;
          break;
        case 'pending':
          filter.isEmailVerified = false;
          break;
      }
    }
    if (isVerified !== undefined) {
      if (isVerified === 'true') {
        filter.isEmailVerified = true;
        filter.isPhoneVerified = true;
        filter.isMedicalVerified = true;
      } else {
        filter.$or = [
          { isEmailVerified: false },
          { isPhoneVerified: false },
          { isMedicalVerified: false }
        ];
      }
    }
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (state) filter['address.state'] = new RegExp(state, 'i');
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    // Sorting
    const sortByParam = req.query.sortBy || 'createdAt';
    const sortOrderParam = (req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const sort = {};
    if (sortByParam === 'name') {
      sort.firstName = sortOrderParam;
      sort.lastName = sortOrderParam;
    } else if (sortByParam === 'email') {
      sort.email = sortOrderParam;
    } else {
      sort[sortByParam] = sortOrderParam;
    }

    const users = await User.find(filter)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
router.post('/', protect, [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').isLength({ min: 10 }).withMessage('Phone must be at least 10 characters'),
  body('role').isIn(['donor', 'recipient', 'medical_admin', 'system_admin']).withMessage('Please provide a valid role'),
  body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Please provide a valid blood type'),
  body('dateOfBirth').optional().isDate().withMessage('Please provide a valid date of birth'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Please provide a valid gender'),
  body('address.street').optional().trim().isLength({ min: 3 }).withMessage('Street address must be at least 3 characters'),
  body('address.city').optional().trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('address.state').optional().trim().isLength({ min: 2 }).withMessage('State must be at least 2 characters'),
  body('address.zipCode').optional().trim().isLength({ min: 3 }).withMessage('Zip code must be at least 3 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Create user validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      bloodType,
      dateOfBirth,
      gender,
      address
    } = req.body;

    // Map zipCode/postalCode and provide minimal required defaults for strict schema
    const normalizedAddress = address || {};
    if (normalizedAddress.zipCode && !normalizedAddress.postalCode) {
      normalizedAddress.postalCode = normalizedAddress.zipCode;
    }
    if (!normalizedAddress.country) normalizedAddress.country = 'Pakistan';
    if (!normalizedAddress.street) normalizedAddress.street = 'Unknown';
    if (!normalizedAddress.city) normalizedAddress.city = 'Unknown';
    if (!normalizedAddress.state) normalizedAddress.state = 'Unknown';
    if (!normalizedAddress.postalCode) normalizedAddress.postalCode = '00000';
    if (!normalizedAddress.coordinates || !Array.isArray(normalizedAddress.coordinates?.coordinates)) {
      // Fallback coordinates (Karachi) to satisfy required GeoJSON; frontend can update later
      normalizedAddress.coordinates = { type: 'Point', coordinates: [67.0011, 24.8607] };
    }

    // Provide defaults for strict required schema fields when creating by admin
    const finalBloodType = bloodType || 'O+';
    const finalGender = gender || 'other';
    const finalDob = dateOfBirth ? new Date(dateOfBirth) : new Date('1990-01-01');

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      logger.warn('Create user conflict (email/phone exists):', { email, phone });
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered'
      });
    }

    // Check if trying to create admin and admin already exists
    if (role === 'system_admin' || role === 'medical_admin') {
      const existingAdmin = await User.findOne({
        role: { $in: ['system_admin', 'medical_admin'] }
      });
      
      if (existingAdmin) {
        logger.warn('Create user admin blocked: admin already exists');
        return res.status(400).json({
          success: false,
          message: 'Admin user already exists. Admin creation is not allowed.'
        });
      }
    }

    // Create user - password will be hashed by User model's pre-save hook
    const user = new User({
      firstName,
      lastName,
      email,
      password: password, // Set plain password - pre-save hook will hash it automatically
      phone,
      role,
      bloodType: finalBloodType,
      dateOfBirth: finalDob,
      gender: finalGender,
      address: normalizedAddress,
      // Provide minimal medical and physical defaults to pass schema requirements where applicable
      weight: req.body.weight || 60,
      height: req.body.height || 170,
      emergencyContact: req.body.emergencyContact || { name: `${firstName} ${lastName}`, phone, relationship: 'self' },
      isEmailVerified: true, // Admin created users are pre-verified
      isActive: true
    });

    // Save user - pre-save hook will automatically hash the password
    await user.save();

    // Log user creation
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'create',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `User created by admin: ${firstName} ${lastName}`,
      changes: { before: {}, after: { firstName, lastName, email, role } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`User created by admin: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Create user error:', error);
    // Surface validation errors clearly
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -emailVerificationToken -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can view this profile
    const canView = req.user._id.toString() === user._id.toString() || 
                   ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', [
  protect,
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().isLength({ min: 10, max: 15 }),
  body('dateOfBirth').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('weight').optional().isFloat({ min: 30, max: 300 }),
  body('height').optional().isFloat({ min: 100, max: 250 }),
  body('address.street').optional().trim().isLength({ min: 5 }),
  body('address.city').optional().trim().isLength({ min: 2 }),
  body('address.state').optional().trim().isLength({ min: 2 }),
  body('address.postalCode').optional().trim().isLength({ min: 3 }),
  body('emergencyContact.name').optional().trim().isLength({ min: 2 }),
  body('emergencyContact.phone').optional().isMobilePhone(),
  body('emergencyContact.relationship').optional().trim().isLength({ min: 2 }),
  // Medical history validation
  body('medicalHistory.hasDiabetes').optional().isBoolean(),
  body('medicalHistory.hasHypertension').optional().isBoolean(),
  body('medicalHistory.hasHeartDisease').optional().isBoolean(),
  body('medicalHistory.hasCancer').optional().isBoolean(),
  body('medicalHistory.hasHepatitis').optional().isBoolean(),
  body('medicalHistory.hasHIV').optional().isBoolean(),
  body('medicalHistory.hasTuberculosis').optional().isBoolean(),
  body('medicalHistory.hasEpilepsy').optional().isBoolean(),
  body('medicalHistory.hasAsthma').optional().isBoolean(),
  body('medicalHistory.hasAllergies').optional().isBoolean(),
  body('medicalHistory.allergiesDescription').optional().trim().isLength({ max: 500 }),
  body('medicalHistory.medications').optional().isArray(),
  body('medicalHistory.medications.*').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can update this profile
    const canUpdate = req.user._id.toString() === user._id.toString() || 
                     ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    // Store original data for audit trail
    const originalData = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address
    };

    // Update allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
      'weight', 'height', 'address', 'emergencyContact', 'medicalHistory',
      'preferredContactMethod', 'availabilityRadius', 'settings'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    // Log profile update
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'profile_update',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'User profile updated',
      changes: { before: originalData, after: req.body },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Upload profile picture
// @route   POST /api/users/:id/profile-picture
// @access  Private
router.post('/:id/profile-picture', protect, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can update this profile
    const canUpdate = req.user._id.toString() === user._id.toString() || 
                     ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check if Cloudinary is configured
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
                                  process.env.CLOUDINARY_API_KEY && 
                                  process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key';

    let profilePictureUrl;

    if (isCloudinaryConfigured) {
      // Upload to Cloudinary
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'bloodlink/profile-pictures',
              public_id: `user_${user._id}_${Date.now()}`,
              transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });

        // Delete old profile picture if exists
        if (user.profilePicture && user.profilePicture.includes('cloudinary.com')) {
          const publicId = user.profilePicture.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`bloodlink/profile-pictures/${publicId}`);
        }

        profilePictureUrl = result.secure_url;
      } catch (cloudinaryError) {
        logger.warn('Cloudinary upload failed, falling back to local storage:', cloudinaryError.message);
        // Fall through to local storage
      }
    }

    // If Cloudinary failed or not configured, use local storage
    if (!profilePictureUrl) {
      const fs = require('fs');
      const path = require('path');
      const sharp = require('sharp');

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `user_${user._id}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Process image with sharp (resize to 400x400, crop to face)
      await sharp(req.file.buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(filePath);

      // Delete old profile picture if exists
      if (user.profilePicture && user.profilePicture.includes('/uploads/')) {
        const oldFileName = path.basename(user.profilePicture);
        const oldFilePath = path.join(uploadsDir, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Set profile picture URL to local path
      profilePictureUrl = `/uploads/profile-pictures/${fileName}`;
    }

    // Update user profile picture
    user.profilePicture = profilePictureUrl;
    await user.save();

    // Log profile picture update
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'profile_picture_update',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Profile picture updated',
      changes: { before: null, after: { profilePicture: result.secure_url } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Profile picture updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: { profilePicture: result.secure_url }
    });

  } catch (error) {
    logger.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update medical history
// @route   PUT /api/users/:id/medical-history
// @access  Private
router.put('/:id/medical-history', [
  protect,
  body('medicalHistory').isObject().withMessage('Medical history is required')
], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can update this profile
    const canUpdate = req.user._id.toString() === user._id.toString() || 
                     ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update medical history'
      });
    }

    // Store original medical history for audit trail
    const originalMedicalHistory = { ...user.medicalHistory.toObject() };

    // Update medical history
    user.medicalHistory = { ...user.medicalHistory.toObject(), ...req.body.medicalHistory };
    await user.save();

    // Log medical history update
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'medical_update',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Medical history updated',
      changes: { before: originalMedicalHistory, after: user.medicalHistory },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'high'
    });

    logger.info(`Medical history updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Medical history updated successfully',
      data: { medicalHistory: user.medicalHistory }
    });

  } catch (error) {
    logger.error('Update medical history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update availability
// @route   PUT /api/users/:id/availability
// @access  Private
router.put('/:id/availability', [
  protect,
  body('isAvailable').isBoolean().withMessage('Availability status is required'),
  body('availabilityRadius').optional().isInt({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can update this profile
    const canUpdate = req.user._id.toString() === user._id.toString() || 
                     ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update availability'
      });
    }

    // Update availability
    user.isAvailable = req.body.isAvailable;
    if (req.body.availabilityRadius) {
      user.availabilityRadius = req.body.availabilityRadius;
    }

    await user.save();

    // Log availability update
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'availability_update',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Availability updated to ${req.body.isAvailable ? 'available' : 'unavailable'}`,
      changes: { before: { isAvailable: !req.body.isAvailable }, after: { isAvailable: req.body.isAvailable } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Availability updated: ${user.email} - ${req.body.isAvailable ? 'available' : 'unavailable'}`);

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: { 
        isAvailable: user.isAvailable,
        availabilityRadius: user.availabilityRadius
      }
    });

  } catch (error) {
    logger.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/:id/statistics
// @access  Private
router.get('/:id/statistics', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can view this data
    const canView = req.user._id.toString() === user._id.toString() || 
                   ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this data'
      });
    }

    // Get user statistics
    const statistics = {
      totalRequests: user.statistics.totalRequests,
      totalDonations: user.statistics.totalDonations,
      totalLivesSaved: user.statistics.totalLivesSaved,
      averageResponseTime: user.statistics.averageResponseTime,
      rating: user.statistics.rating,
      totalRatings: user.statistics.totalRatings,
      lastDonationDate: user.medicalHistory.lastDonationDate,
      totalDonations: user.medicalHistory.totalDonations,
      canDonate: user.canDonate(),
      age: user.age,
      bmi: user.bmi
    };

    res.json({
      success: true,
      data: { statistics }
    });

  } catch (error) {
    logger.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Block/Unblock user (Admin only)
// @route   PUT /api/users/:id/block
// @access  Private/Admin
router.put('/:id/block', protect, async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent blocking other admins
    if (user.role === 'system_admin' && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to block system admin'
      });
    }

    const originalStatus = user.isBlocked;
    user.isBlocked = isBlocked;
    await user.save();

    // Log user block/unblock
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: isBlocked ? 'user_block' : 'user_unblock',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `User ${isBlocked ? 'blocked' : 'unblocked'}${reason ? `: ${reason}` : ''}`,
      changes: { before: { isBlocked: originalStatus }, after: { isBlocked } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'high'
    });

    logger.info(`User ${isBlocked ? 'blocked' : 'unblocked'}: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: { isBlocked: user.isBlocked }
    });

  } catch (error) {
    logger.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting other system admins
    if (user.role === 'system_admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete other system admins'
      });
    }

    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture) {
      const publicId = user.profilePicture.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`bloodlink/profile-pictures/${publicId}`);
    }

    await User.findByIdAndDelete(req.params.id);

    // Log user deletion
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'user_delete',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'User deleted',
      changes: { before: { email: user.email, role: user.role }, after: null },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'critical'
    });

    logger.info(`User deleted: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get donor dashboard data
// @route   GET /api/users/dashboard/donor
// @access  Private (Donor only)
router.get('/dashboard/donor', protect, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Ensure user is a donor
    if (req.user.role !== 'donor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Donor role required.'
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        previousEndDate.setDate(endDate.getDate() - 8);
        previousStartDate.setDate(endDate.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        previousEndDate.setDate(endDate.getDate() - 31);
        previousStartDate.setDate(endDate.getDate() - 60);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        previousEndDate.setDate(endDate.getDate() - 91);
        previousStartDate.setDate(endDate.getDate() - 180);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        previousEndDate.setFullYear(endDate.getFullYear() - 1);
        previousStartDate.setFullYear(endDate.getFullYear() - 2);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
        previousEndDate.setDate(endDate.getDate() - 31);
        previousStartDate.setDate(endDate.getDate() - 60);
    }

    // Get donor's donations for current period
    const currentDonations = await Donation.find({
      donorId: req.user._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get donor's donations for previous period
    const previousDonations = await Donation.find({
      donorId: req.user._id,
      createdAt: { $gte: previousStartDate, $lte: previousEndDate }
    });

    // Calculate statistics
    const totalDonations = currentDonations.length;
    const previousDonationsCount = previousDonations.length;
    
    const totalBloodCollected = currentDonations.reduce((sum, donation) => {
      return sum + (donation.bloodUnits * 450); // Each unit is approximately 450ml
    }, 0);

    const previousBloodCollected = previousDonations.reduce((sum, donation) => {
      return sum + (donation.bloodUnits * 450);
    }, 0);

    // Get all donations count (not just current period)
    const allTimeDonationsCount = await Donation.countDocuments({
      donorId: req.user._id
    });

    // Get completed donations count
    const completedDonationsCount = await Donation.countDocuments({
      donorId: req.user._id,
      status: 'completed'
    });

    // Get scheduled/upcoming donations
    const upcomingDonations = await Donation.find({
      donorId: req.user._id,
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledDate: { $gte: new Date() }
    })
      .sort({ scheduledDate: 1 })
      .limit(5)
      .select('status scheduledDate scheduledTime collectionSite donationType bloodUnits');

    // Get last donation date
    const lastDonation = await Donation.findOne({
      donorId: req.user._id,
      status: 'completed'
    }).sort({ createdAt: -1 });

    // Calculate days since last donation
    let daysSinceLastDonation = null;
    let nextEligibleDate = null;
    if (lastDonation?.actualDate || lastDonation?.scheduledDate) {
      const lastDate = lastDonation.actualDate || lastDonation.scheduledDate;
      daysSinceLastDonation = Math.floor((new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24));
      
      // Calculate next eligible date (56 days after last donation)
      if (lastDate) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 56);
        nextEligibleDate = nextDate;
      }
    }

    // Check eligibility
    const eligibilityCheck = req.user.canDonate();

    // Get recent donations for activity feed
    const recentDonations = await Donation.find({
      donorId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('status scheduledDate actualDate createdAt donationType bloodUnits');

    // Get recent activity from audit trail
    const recentActivityAudit = await AuditTrail.find({
      userId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('action description createdAt userId userRole changes metadata status')
      .populate('userId', 'firstName lastName email role');

    // System-wide urgency counts for dashboard widgets
    const [criticalRequests, highUrgencyRequests, mediumUrgencyRequests, lowUrgencyRequests] = await Promise.all([
      BloodRequest.countDocuments({ urgency: 'critical', status: { $in: ['pending', 'matched', 'confirmed'] } }),
      BloodRequest.countDocuments({ urgency: 'high', status: { $in: ['pending', 'matched', 'confirmed'] } }),
      BloodRequest.countDocuments({ urgency: 'medium', status: { $in: ['pending', 'matched', 'confirmed'] } }),
      BloodRequest.countDocuments({ urgency: 'low', status: { $in: ['pending', 'matched', 'confirmed'] } })
    ]);

    const dashboardData = {
      totalDonations,
      previousDonations: previousDonationsCount,
      totalBloodCollected,
      previousBloodCollected,
      lastDonationDate: lastDonation?.actualDate || lastDonation?.scheduledDate || null,
      daysSinceLastDonation,
      nextEligibleDate,
      bloodType: req.user.bloodType,
      donationsCount: allTimeDonationsCount,
      completedDonationsCount,
      upcomingDonationsCount: upcomingDonations.length,
      upcomingDonations: upcomingDonations.map(donation => ({
        _id: donation._id,
        status: donation.status,
        scheduledDate: donation.scheduledDate,
        scheduledTime: donation.scheduledTime,
        collectionSite: donation.collectionSite,
        donationType: donation.donationType,
        bloodUnits: donation.bloodUnits
      })),
      eligibility: {
        canDonate: eligibilityCheck.canDonate,
        reason: eligibilityCheck.reason || null,
        warning: eligibilityCheck.warning || null
      },
      // Include urgency widgets so UI always has data
      criticalRequests,
      highUrgencyRequests,
      mediumUrgencyRequests,
      lowUrgencyRequests,
      recentActivity: (() => {
        const { formatActivitiesForRole } = require('../utils/activityFormatter');
        const formattedAudit = formatActivitiesForRole(recentActivityAudit, 'donor', req.user._id);
        
        // Also include donation activities (for donors, donations are important)
        const donationActivities = Array.isArray(recentDonations) 
          ? recentDonations.slice(0, 3).map(donation => ({
              description: `Donation ${donation.status === 'completed' ? 'completed' : donation.status || 'scheduled'} - ${donation.donationType?.replace('_', ' ') || 'blood'} (${donation.bloodUnits || 1} unit${donation.bloodUnits > 1 ? 's' : ''})`,
              type: 'donation',
              icon: '🩸',
              createdAt: donation.actualDate || donation.scheduledDate || donation.createdAt
            }))
          : [];
        
        // Combine and sort
        const combined = [...formattedAudit, ...donationActivities]
          .filter(activity => activity && activity.createdAt)
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 5);
        
        return combined;
      })()
    };

    res.json({
      success: true,
      data: { dashboard: dashboardData }
    });

  } catch (error) {
    logger.error('Get donor dashboard error:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error details:', {
      message: error.message,
      name: error.name,
      userId: req.user?._id,
      role: req.user?.role
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get recipient dashboard data
// @route   GET /api/users/dashboard/recipient
// @access  Private (Recipient only)
router.get('/dashboard/recipient', protect, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Ensure user is a recipient
    if (req.user.role !== 'recipient') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Recipient role required.'
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        previousEndDate.setDate(endDate.getDate() - 8);
        previousStartDate.setDate(endDate.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        previousEndDate.setDate(endDate.getDate() - 31);
        previousStartDate.setDate(endDate.getDate() - 60);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        previousEndDate.setDate(endDate.getDate() - 91);
        previousStartDate.setDate(endDate.getDate() - 180);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        previousEndDate.setFullYear(endDate.getFullYear() - 1);
        previousStartDate.setFullYear(endDate.getFullYear() - 2);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
        previousEndDate.setDate(endDate.getDate() - 31);
        previousStartDate.setDate(endDate.getDate() - 60);
    }

    // Get recipient's requests for current period
    const currentRequests = await BloodRequest.find({
      requesterId: req.user._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get recipient's requests for previous period
    const previousRequests = await BloodRequest.find({
      requesterId: req.user._id,
      createdAt: { $gte: previousStartDate, $lte: previousEndDate }
    });

    // Get all recipient's requests for status counts
    const allRequests = await BloodRequest.find({
      requesterId: req.user._id
    });

    // Calculate statistics with correct statuses
    const totalRequests = currentRequests.length;
    const previousRequestsCount = previousRequests.length;
    const pendingRequests = allRequests.filter(r => r.status === 'pending').length;
    const matchedRequests = allRequests.filter(r => r.status === 'matched').length;
    const confirmedRequests = allRequests.filter(r => r.status === 'confirmed').length;
    const fulfilledRequests = allRequests.filter(r => r.status === 'fulfilled' || r.status === 'completed').length; // Support both
    const criticalRequests = allRequests.filter(r => r.urgency === 'critical' && ['pending', 'matched', 'confirmed'].includes(r.status)).length;
    const highUrgencyRequests = allRequests.filter(r => r.urgency === 'high' && ['pending', 'matched', 'confirmed'].includes(r.status)).length;
    const mediumUrgencyRequests = allRequests.filter(r => r.urgency === 'medium' && ['pending', 'matched', 'confirmed'].includes(r.status)).length;
    const lowUrgencyRequests = allRequests.filter(r => r.urgency === 'low' && ['pending', 'matched', 'confirmed'].includes(r.status)).length;

    // Get recent requests for activity feed
    const recentRequests = await BloodRequest.find({
      requesterId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('status urgency bloodType createdAt completedAt');

    // Get recent activity from audit trail
    const recentActivityAudit = await AuditTrail.find({
      userId: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('action description createdAt userId userRole changes metadata status')
      .populate('userId', 'firstName lastName email role');

    const dashboardData = {
      totalRequests,
      previousRequests: previousRequestsCount,
      pendingRequests,
      matchedRequests,
      confirmedRequests,
      fulfilledRequests,
      criticalRequests,
      highUrgencyRequests,
      mediumUrgencyRequests,
      lowUrgencyRequests,
      recentActivity: (() => {
        const { formatActivitiesForRole } = require('../utils/activityFormatter');
        const formattedAudit = formatActivitiesForRole(recentActivityAudit, 'recipient', req.user._id);
        
        // Also include request activities (for recipients, requests are important)
        const requestActivities = Array.isArray(recentRequests) 
          ? recentRequests.slice(0, 3).map(request => ({
              description: `Blood request ${request.status === 'completed' ? 'fulfilled' : request.status || 'created'} - ${request.bloodType || ''}`,
              type: 'request',
              icon: '🩸',
              createdAt: request.completedAt || request.createdAt
            }))
          : [];
        
        // Combine and sort
        const combined = [...formattedAudit, ...requestActivities]
          .filter(activity => activity && activity.createdAt)
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 5);
        
        return combined;
      })()
    };

    res.json({
      success: true,
      data: { dashboard: dashboardData }
    });

  } catch (error) {
    logger.error('Get recipient dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get admin dashboard data
// @route   GET /api/users/dashboard/admin
// @access  Private (Admin only)
router.get('/dashboard/admin', protect, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Ensure user is admin
    if (!['medical_admin', 'system_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    // Calculate date range for current period
    const endDate = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        previousEndDate.setDate(endDate.getDate() - 8);
        previousStartDate.setDate(endDate.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        previousEndDate.setDate(endDate.getDate() - 31);
        previousStartDate.setDate(endDate.getDate() - 60);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        previousEndDate.setDate(endDate.getDate() - 91);
        previousStartDate.setDate(endDate.getDate() - 180);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        previousEndDate.setFullYear(endDate.getFullYear() - 1);
        previousStartDate.setFullYear(endDate.getFullYear() - 2);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
        previousEndDate.setDate(endDate.getDate() - 31);
        previousStartDate.setDate(endDate.getDate() - 60);
    }

    // Get comprehensive statistics for current period
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalRequests,
      completedRequests,
      pendingRequests,
      matchedRequests,
      confirmedRequests,
      criticalRequests,
      highUrgencyRequests,
      mediumUrgencyRequests,
      lowUrgencyRequests,
      totalDonations,
      successfulDonations,
      totalNotifications,
      unreadNotifications,
      systemAlerts,
      recentActivityRaw
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $lte: endDate } }),
      User.countDocuments({ 
        lastActivity: { $gte: startDate, $lte: endDate },
        isActive: true 
      }),
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      BloodRequest.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      BloodRequest.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'fulfilled'
      }),
      BloodRequest.countDocuments({ 
        status: 'pending',
        expiresAt: { $gt: new Date() }
      }),
      BloodRequest.countDocuments({ 
        status: 'matched',
        expiresAt: { $gt: new Date() }
      }),
      BloodRequest.countDocuments({ 
        status: 'confirmed',
        expiresAt: { $gt: new Date() }
      }),
      BloodRequest.countDocuments({ 
        urgency: 'critical',
        status: { $in: ['pending', 'matched', 'confirmed'] }
      }),
      BloodRequest.countDocuments({ 
        urgency: 'high',
        status: { $in: ['pending', 'matched', 'confirmed'] }
      }),
      BloodRequest.countDocuments({ 
        urgency: 'medium',
        status: { $in: ['pending', 'matched', 'confirmed'] }
      }),
      BloodRequest.countDocuments({ 
        urgency: 'low',
        status: { $in: ['pending', 'matched', 'confirmed'] }
      }),
      Donation.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Donation.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }),
      Notification.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Notification.countDocuments({ 
        isRead: false,
        expiresAt: { $gt: new Date() }
      }),
      AuditTrail.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        riskLevel: { $in: ['high', 'critical'] }
      }),
      AuditTrail.find({
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(20)
      .select('action description createdAt userId userEmail riskLevel changes metadata status')
    ]);

    // Get previous period data for trends
    const [
      previousUsers,
      previousRequests,
      previousDonations,
      previousBloodCollected
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: previousStartDate, $lte: previousEndDate } }),
      BloodRequest.countDocuments({ createdAt: { $gte: previousStartDate, $lte: previousEndDate } }),
      Donation.countDocuments({ createdAt: { $gte: previousStartDate, $lte: previousEndDate } }),
      Donation.aggregate([
        { $match: { createdAt: { $gte: previousStartDate, $lte: previousEndDate } } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$bloodUnits', 450] } } } }
      ])
    ]);

    // Calculate previous blood collected
    const prevBloodCollected = previousBloodCollected.length > 0 ? previousBloodCollected[0].total : 0;

    // Calculate current blood collected
    const currentBloodCollected = await Donation.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$bloodUnits', 450] } } } }
    ]);
    const totalBloodCollected = currentBloodCollected.length > 0 ? currentBloodCollected[0].total : 0;

    // Get pending medical verifications
    const pendingVerifications = await User.countDocuments({
      role: { $in: ['donor', 'recipient'] },
      isMedicalVerified: false,
      isActive: true
    });

    // Get active donors count
    const activeDonors = await User.countDocuments({
      role: 'donor',
      isActive: true,
      isMedicalVerified: true
    });

    // Format recent activity using activity formatter
    const { formatActivitiesForRole } = require('../utils/activityFormatter');
    const recentActivity = formatActivitiesForRole(recentActivityRaw, req.user.role, req.user._id);

    // Calculate success rates
    const requestSuccessRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
    const donationSuccessRate = totalDonations > 0 ? (successfulDonations / totalDonations) * 100 : 0;

    // Get blood type distribution
    const bloodTypeDistribution = await User.aggregate([
      { $match: { isActive: true, role: { $in: ['donor', 'recipient'] } } },
      {
        $group: {
          _id: '$bloodType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get urgency distribution
    const urgencyDistribution = await BloodRequest.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$urgency',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Calculate system health (simplified)
    const systemHealth = 99.9; // Can be enhanced with actual health metrics

    const dashboardData = {
      // Top-level stats for easy access
      totalUsers,
      activeUsers,
      previousUsers,
      newUsers,
      activeDonors,
      totalRequests,
      previousRequests,
      completedRequests,
      pendingRequests,
      matchedRequests,
      confirmedRequests,
      criticalRequests,
      highUrgencyRequests,
      mediumUrgencyRequests,
      lowUrgencyRequests,
      totalDonations,
      previousDonations,
      successfulDonations,
      totalBloodCollected,
      previousBloodCollected: prevBloodCollected,
      totalNotifications,
      unreadNotifications,
      systemAlerts,
      pendingVerifications,
      systemHealth,
      requestSuccessRate: Math.round(requestSuccessRate * 100) / 100,
      donationSuccessRate: Math.round(donationSuccessRate * 100) / 100,
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        activeDonors,
        totalRequests,
        completedRequests,
        pendingRequests,
        matchedRequests,
        confirmedRequests,
        criticalRequests,
        highUrgencyRequests,
        mediumUrgencyRequests,
        lowUrgencyRequests,
        totalDonations,
        successfulDonations,
        totalNotifications,
        unreadNotifications,
        systemAlerts,
        pendingVerifications,
        requestSuccessRate: Math.round(requestSuccessRate * 100) / 100,
        donationSuccessRate: Math.round(donationSuccessRate * 100) / 100
      },
      distributions: {
        bloodType: bloodTypeDistribution,
        urgency: urgencyDistribution
      },
      recentActivity
    };

    res.json({
      success: true,
      data: { dashboard: dashboardData }
    });

  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error details:', {
      message: error.message,
      name: error.name,
      userId: req.user?._id,
      role: req.user?.role
    });
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Change user role (Admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
router.put('/:id/role', protect, [
  body('role').isIn(['donor', 'recipient', 'medical_admin', 'system_admin']).withMessage('Please provide a valid role'),
  body('reason').optional().trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { role, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent changing system admin role unless current user is system admin
    if (user.role === 'system_admin' && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change system admin role'
      });
    }

    // Prevent changing to system admin unless current user is system admin
    if (role === 'system_admin' && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign system admin role'
      });
    }

    const originalRole = user.role;
    user.role = role;
    await user.save();

    // Log role change
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'role_change',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `User role changed from ${originalRole} to ${role}`,
      changes: { before: { role: originalRole }, after: { role } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      metadata: { reason }
    });

    logger.info(`User role changed: ${user.email} from ${originalRole} to ${role}`);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Change user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Reset user password (Admin only)
// @route   POST /api/users/:id/reset-password
// @access  Private/Admin
router.post('/:id/reset-password', protect, [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('reason').optional().trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { newPassword, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent resetting system admin password unless current user is system admin
    if (user.role === 'system_admin' && req.user.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reset system admin password'
      });
    }

    // Set plain password - pre-save hook will hash it automatically
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    // Save user - pre-save hook will automatically hash the password
    await user.save();

    // Log password reset
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'password_reset',
      resourceType: 'user',
      resourceId: user._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'User password reset by admin',
      changes: { before: {}, after: { passwordChanged: true } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      metadata: { reason }
    });

    logger.info(`User password reset: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: { userId: user._id }
    });

  } catch (error) {
    logger.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user activity (Admin only)
// @route   GET /api/users/:id/activity
// @access  Private/Admin
router.get('/:id/activity', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user activity from audit trail
    const activities = await AuditTrail.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('userId', 'firstName lastName email role');

    const totalActivities = await AuditTrail.countDocuments({ userId: id });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalActivities / limit),
          totalItems: totalActivities,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to get location from IP
const getLocationFromIP = async (ipAddress) => {
  // In a real implementation, you would use a geolocation service
  return {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown'
  };
};

module.exports = router;
