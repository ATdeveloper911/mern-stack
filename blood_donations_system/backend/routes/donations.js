const express = require('express');
const { body, validationResult } = require('express-validator');
const Donation = require('../models/Donation');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const AuditTrail = require('../models/AuditTrail');
const { protect, authorize, canDonate, requireMedicalVerification } = require('../middleware/auth');
const { generateDonationId, generateBatchNumber } = require('../utils/generateToken');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get all donations
// @route   GET /api/donations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const {
      donorId,
      status,
      bloodType,
      donationType,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Filter based on user role
    if (req.user.role === 'donor') {
      // Donors can only see their own donations
      filter.donorId = req.user._id;
      logger.info(`Filtering donations for donor: ${req.user._id} (${req.user.email})`);
    } else if (req.user.role === 'recipient') {
      // Recipients can see donations related to their blood requests
      // Strategy: Show donations from donors who have accepted their requests
      // This includes:
      // 1. Donations explicitly linked to requests (via requestId)
      // 2. Donations from donors who accepted their requests (via matchedDonors)
      try {
        const userRequests = await BloodRequest.find({ requesterId: req.user._id })
          .select('_id matchedDonors')
          .populate('matchedDonors.donorId', '_id')
          .lean();
        
        const requestIds = userRequests.map(req => req._id);
        
        // Get all donor IDs who have accepted/responded to recipient's requests
        const donorIds = new Set();
        userRequests.forEach(request => {
          if (request.matchedDonors && Array.isArray(request.matchedDonors)) {
            request.matchedDonors.forEach(match => {
              if (match.donorId && (match.status === 'accepted' || match.status === 'pending')) {
                const donorId = match.donorId._id || match.donorId;
                donorIds.add(donorId.toString());
              }
            });
          }
        });
        
        logger.info(`Recipient ${req.user._id} has ${userRequests.length} blood requests`);
        logger.info(`Recipient has ${donorIds.size} donors who responded to their requests`);
        
        if (requestIds.length > 0 || donorIds.size > 0) {
          // Build filter: donations linked to requests OR from responding donors
          const filterConditions = [];
          
          // Condition 1: Donations explicitly linked to recipient's requests
          if (requestIds.length > 0) {
            filterConditions.push({ requestId: { $in: requestIds } });
          }
          
          // Condition 2: Donations from donors who accepted recipient's requests
          if (donorIds.size > 0) {
            const donorIdsArray = Array.from(donorIds);
            filterConditions.push({ donorId: { $in: donorIdsArray } });
          }
          
          // Use $or to combine conditions
          if (filterConditions.length > 0) {
            filter.$or = filterConditions;
            logger.info(`Filtering donations for recipient: ${req.user._id} (${req.user.email})`);
            logger.info(`- Request IDs: ${requestIds.length > 0 ? requestIds.map(id => id.toString()).join(', ') : 'none'}`);
            logger.info(`- Donor IDs: ${donorIds.size > 0 ? Array.from(donorIds).join(', ') : 'none'}`);
          } else {
            // No conditions, show no donations
            filter._id = { $in: [] };
          }
        } else {
          // No requests and no responding donors, so no donations to show
          filter._id = { $in: [] };
          logger.info(`Recipient ${req.user._id} has no blood requests and no responding donors, showing no donations`);
        }
      } catch (err) {
        logger.error(`Error fetching blood requests for recipient ${req.user._id}:`, err);
        logger.error(`Error details:`, { message: err.message, stack: err.stack });
        // If there's an error, show no donations (safer than showing all)
        filter._id = { $in: [] };
      }
    } else if (['medical_admin', 'system_admin'].includes(req.user.role)) {
      // Admins can see all donations or filter by donorId
      if (donorId) {
        filter.donorId = donorId;
      }
    }
    
    // Apply other filters
    if (status) filter.status = status;
    if (bloodType) filter.donorBloodType = bloodType;
    if (donationType) filter.donationType = donationType;
    if (startDate || endDate) {
      filter.scheduledDate = {};
      if (startDate) filter.scheduledDate.$gte = new Date(startDate);
      if (endDate) filter.scheduledDate.$lte = new Date(endDate);
    }
    
    // Handle search - combine with existing filters using $and
    if (search) {
      const searchOr = {
        $or: [
          { donorName: new RegExp(search, 'i') },
          { 'storage.batchNumber': new RegExp(search, 'i') }
        ]
      };
      
      // Use $and to combine search with existing filters
      // Handle both $or (from recipient filter) and regular filters
      if (filter.$or && !filter.$and) {
        // Recipient filter uses $or, combine with search using $and
        const existingFilters = { ...filter };
        filter.$and = [
          existingFilters,
          searchOr
        ];
        // Remove top-level $or that is now in $and[0]
        delete filter.$or;
      } else if (Object.keys(filter).length > 0 && !filter.$and && !filter.$or) {
        const existingFilters = { ...filter };
        filter.$and = [
          existingFilters,
          searchOr
        ];
        // Remove top-level fields that are now in $and[0]
        Object.keys(existingFilters).forEach(key => {
          if (key !== '$and') delete filter[key];
        });
      } else if (Object.keys(filter).length === 0) {
        // No existing filters, just use search directly
        filter.$or = searchOr.$or;
      } else if (filter.$and) {
        // Filter already has $and, add search to it
        filter.$and.push(searchOr);
      }
    }

    // Debug: Check total donations for this user (before filters)
    if (req.user.role === 'donor') {
      const totalDonationsForUser = await Donation.countDocuments({ donorId: req.user._id });
      logger.info(`Total donations for donor ${req.user._id} (${req.user.email}): ${totalDonationsForUser}`);
      
      // Also check if any donations exist with just donorId filter (no other filters)
      const simpleFilter = { donorId: req.user._id };
      const simpleCount = await Donation.countDocuments(simpleFilter);
      logger.info(`Donations with simple filter (donorId only): ${simpleCount}`);
    } else if (req.user.role === 'recipient') {
      // Check if recipient has any blood requests and responding donors
      const allUserRequests = await BloodRequest.find({ requesterId: req.user._id })
        .select('_id matchedDonors')
        .populate('matchedDonors.donorId', '_id')
        .lean();
      logger.info(`Recipient ${req.user._id} has ${allUserRequests.length} total blood requests`);
      
      if (allUserRequests.length > 0) {
        const requestIds = allUserRequests.map(req => req._id);
        logger.info(`Request IDs: ${requestIds.map(id => id.toString()).join(', ')}`);
        
        // Get responding donor IDs
        const donorIds = new Set();
        allUserRequests.forEach(request => {
          if (request.matchedDonors && Array.isArray(request.matchedDonors)) {
            request.matchedDonors.forEach(match => {
              if (match.donorId && (match.status === 'accepted' || match.status === 'pending')) {
                const donorId = match.donorId._id || match.donorId;
                donorIds.add(donorId.toString());
              }
            });
          }
        });
        
        // Check donations linked to requests
        const donationsByRequestId = await Donation.countDocuments({ requestId: { $in: requestIds } });
        logger.info(`Donations linked to requests: ${donationsByRequestId}`);
        
        // Check donations from responding donors
        if (donorIds.size > 0) {
          const donorIdsArray = Array.from(donorIds);
          const donationsByDonorId = await Donation.countDocuments({ donorId: { $in: donorIdsArray } });
          logger.info(`Donations from responding donors: ${donationsByDonorId} (from ${donorIds.size} donors)`);
          
          // Check combined
          const combinedFilter = {
            $or: [
              { requestId: { $in: requestIds } },
              { donorId: { $in: donorIdsArray } }
            ]
          };
          const totalDonationsForRecipient = await Donation.countDocuments(combinedFilter);
          logger.info(`Total donations for recipient ${req.user._id} (${req.user.email}): ${totalDonationsForRecipient}`);
        } else {
          logger.info(`No responding donors found for recipient's requests`);
        }
      } else {
        logger.info(`Recipient ${req.user._id} has no blood requests, so no donations to show`);
      }
    }
    
    logger.info('Fetching donations with filter:', {
      filter: JSON.stringify(filter, null, 2),
      userId: req.user._id,
      role: req.user.role,
      page,
      limit,
      searchTerm: search
    });

    // Log the filter for debugging
    if (req.user.role === 'recipient') {
      logger.info(`Recipient filter details:`, {
        filter: JSON.stringify(filter, null, 2),
        requestIdsCount: filter.requestId?.$in?.length || 0,
        requestIds: filter.requestId?.$in || []
      });
    }

    const donations = await Donation.find(filter)
      .populate('donorId', 'firstName lastName email phone bloodType')
      .populate('requestId', 'patientName hospitalName bloodType')
      .populate('preDonationHealthCheck.performedBy', 'firstName lastName')
      .populate('donationProcess.phlebotomist', 'firstName lastName')
      .populate('bloodTesting.testedBy', 'firstName lastName')
      .populate('storage.storageLocation')
      .populate('distribution.distributedTo.hospitalId', 'hospitalName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Donation.countDocuments(filter);
    
    // Additional debug for recipients
    if (req.user.role === 'recipient') {
      logger.info(`Recipient donations query result:`, {
        donationsFound: donations.length,
        totalCount: total,
        firstDonationRequestId: donations[0]?.requestId?._id || donations[0]?.requestId || null
      });
    }
    
    logger.info(`Found ${donations.length} donations out of ${total} total for user ${req.user.email}`);
    
    // Debug: Log first donation if exists
    if (donations.length > 0) {
      logger.info(`First donation ID: ${donations[0]._id}, Donor ID: ${donations[0].donorId}, Status: ${donations[0].status}`);
    } else {
      logger.warn(`No donations found with filter for user ${req.user.email}`);
      // Try to find any donation for debugging (only for donors)
      if (req.user.role === 'donor') {
        const anyDonation = await Donation.findOne({ donorId: req.user._id });
        if (anyDonation) {
          logger.info(`Found a donation in DB but not in query result. Donation ID: ${anyDonation._id}, Donor ID: ${anyDonation.donorId}`);
        } else {
          logger.info(`No donations exist in DB for user ${req.user._id}`);
        }
      } else if (req.user.role === 'recipient') {
        const userRequests = await BloodRequest.find({ requesterId: req.user._id }).select('_id').lean();
        const requestIds = userRequests.map(req => req._id);
        if (requestIds.length > 0) {
          logger.info(`Recipient has ${requestIds.length} requests, checking for donations...`);
          
          // Check donations with exact requestId match
          const anyDonation = await Donation.findOne({ requestId: { $in: requestIds } });
          if (anyDonation) {
            logger.info(`Found a donation in DB: Donation ID: ${anyDonation._id}, Request ID: ${anyDonation.requestId}`);
            logger.info(`Donation requestId type: ${typeof anyDonation.requestId}, toString: ${anyDonation.requestId?.toString()}`);
            logger.info(`Request IDs being searched: ${requestIds.map(id => id.toString()).join(', ')}`);
          } else {
            logger.warn(`No donations found in DB for recipient ${req.user._id} requests`);
            
            // Check if there are ANY donations with requestId at all
            const anyDonationWithRequestId = await Donation.findOne({ requestId: { $exists: true, $ne: null } });
            if (anyDonationWithRequestId) {
              logger.info(`Found donations with requestId in DB, but not matching recipient's requests`);
              logger.info(`Sample donation requestId: ${anyDonationWithRequestId.requestId}, type: ${typeof anyDonationWithRequestId.requestId}`);
            } else {
              logger.warn(`No donations with requestId found in database at all - donations may not be linked to requests`);
            }
          }
        } else {
          logger.info(`Recipient ${req.user._id} has no blood requests`);
        }
      }
    }

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    logger.error('Get donations error:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      role: req.user?.role
    });
    res.status(500).json({
      success: false,
      message: 'Server error while fetching donations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get donation by ID
// @route   GET /api/donations/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donorId', 'firstName lastName email phone bloodType')
      .populate('requestId', 'patientName hospitalName bloodType')
      .populate('preDonationHealthCheck.performedBy', 'firstName lastName')
      .populate('donationProcess.phlebotomist', 'firstName lastName')
      .populate('bloodTesting.testedBy', 'firstName lastName')
      .populate('storage.storageLocation')
      .populate('distribution.distributedTo.hospitalId', 'hospitalName');

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Check if user can view this donation
    const canView = req.user._id.toString() === donation.donorId._id.toString() || 
                   ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this donation'
      });
    }

    res.json({
      success: true,
      data: { donation }
    });

  } catch (error) {
    logger.error('Get donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Schedule donation
// @route   POST /api/donations
// @access  Private
router.post('/', [
  protect,
  // Check medical verification but allow scheduling even if some eligibility checks fail
  // Full eligibility will be checked when donation actually starts
  requireMedicalVerification,
  body('requestId').optional().isMongoId().withMessage('Valid request ID is required'),
  body('donationType').isIn(['whole_blood', 'red_cells', 'platelets', 'plasma']).withMessage('Valid donation type is required'),
  body('bloodUnits').isInt({ min: 1, max: 2 }).withMessage('Blood units must be between 1 and 2'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('scheduledTime').trim().isLength({ min: 1 }).withMessage('Scheduled time is required'),
  body('collectionSite').trim().isLength({ min: 5 }).withMessage('Collection site is required')
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

    const {
      requestId,
      donationType,
      bloodUnits,
      scheduledDate,
      scheduledTime,
      collectionSite,
      additionalNotes
    } = req.body;

    // Check if scheduled date is in the future
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    // Check if request exists and is valid (if provided)
    let bloodRequest = null;
    if (requestId) {
      bloodRequest = await BloodRequest.findById(requestId);
      if (!bloodRequest) {
        return res.status(404).json({
          success: false,
          message: 'Blood request not found'
        });
      }
      if (!['pending', 'matched', 'confirmed'].includes(bloodRequest.status)) {
        return res.status(400).json({
          success: false,
          message: 'Blood request is no longer active'
        });
      }
    }

    // Create donation
    const donorName = req.user.firstName && req.user.lastName 
      ? `${req.user.firstName} ${req.user.lastName}` 
      : req.user.fullName || req.user.email || 'Unknown Donor';
    
    // Ensure required fields are present
    if (!req.user.phone) {
      logger.warn(`Donation scheduling blocked: User ${req.user.email} missing phone number`);
      return res.status(400).json({
        success: false,
        message: 'User phone number is required. Please update your profile.',
        code: 'MISSING_PHONE'
      });
    }
    
    if (!req.user.bloodType) {
      logger.warn(`Donation scheduling blocked: User ${req.user.email} missing blood type`);
      return res.status(400).json({
        success: false,
        message: 'User blood type is required. Please update your profile.',
        code: 'MISSING_BLOOD_TYPE'
      });
    }
    
    // Optional: Check basic eligibility (warn but don't block scheduling)
    // Full eligibility check will happen when donation starts
    const donationCheck = req.user.canDonate();
    if (!donationCheck.canDonate) {
      logger.warn(`Donation eligibility warning for user ${req.user.email}: ${donationCheck.reason}`);
      // Don't block scheduling, but log the warning
      // The actual eligibility check will happen when donation starts
    }
    
    const donation = new Donation({
      donorId: req.user._id,
      donorName: donorName,
      donorPhone: req.user.phone,
      donorEmail: req.user.email,
      donorBloodType: req.user.bloodType,
      requestId: requestId || null,
      isForSpecificRequest: !!requestId,
      donationType,
      bloodUnits,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      collectionSite,
      additionalNotes: additionalNotes || undefined,
      status: 'scheduled'
    });

    await donation.save();

    // Create notification for donor
    const notification = new Notification({
      userId: req.user._id,
      title: '📅 Donation Scheduled',
      message: `Your blood donation is scheduled for ${scheduledDate} at ${scheduledTime}`,
      type: 'appointment',
      priority: 'medium',
      relatedId: donation._id,
      relatedType: 'donation',
      actionRequired: false,
      metadata: {
        scheduledDate,
        scheduledTime,
        collectionSite,
        donationType
      }
    });

    await notification.save();

    // Notify medical admins about new donation
    try {
      const admins = await User.find({ role: { $in: ['medical_admin', 'system_admin'] }, isActive: true }).select('_id email');
      const adminIds = admins.map(a => a._id);
      if (adminIds.length > 0) {
        const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await Notification.sendToMultipleUsers(adminIds, {
          title: '🩸 New Donation Scheduled',
          message: `${donorName} scheduled a ${donationType.replace('_',' ')} donation for ${scheduledDate} ${scheduledTime}`,
          type: 'appointment',
          priority: 'medium',
          isUrgent: false,
          relatedId: donation._id,
          relatedType: 'donation',
          actionRequired: false,
          metadata: {
            donorEmail: req.user.email,
            bloodUnits,
            collectionSite,
            scheduledDate,
            scheduledTime
          },
          sentBy: req.user._id,
          sentBySystem: true,
          expiresAt: in30Days
        });
        logger.info(`Admin notifications created for new donation: ${adminIds.length} recipients`);
      }
    } catch (e) {
      logger.warn('Failed to notify admins about new donation:', e.message);
    }

    // Log donation scheduling
    try {
      const location = await getLocationFromIP(req.ip).catch(() => ({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown'
      }));
      
      await AuditTrail.logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'donation_schedule',
        resourceType: 'donation',
        resourceId: donation._id,
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: 'Donation scheduled',
        changes: { before: null, after: { scheduledDate, donationType, bloodUnits } },
        status: 'success',
        location: location
      });
    } catch (auditError) {
      // Log audit error but don't fail the donation creation
      logger.warn('Failed to log donation audit trail:', auditError);
    }

    logger.info(`Donation scheduled: ${donation._id} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Donation scheduled successfully',
      data: { donation }
    });

  } catch (error) {
    logger.error('Schedule donation error:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error name:', error.name);
    logger.error('Error message:', error.message);
    logger.error('Request body:', req.body);
    logger.error('User:', {
      id: req.user?._id,
      email: req.user?.email,
      role: req.user?.role,
      phone: req.user?.phone,
      bloodType: req.user?.bloodType
    });
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        error: error.message
      });
    }
    
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate entry',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while scheduling donation',
      error: error.message || 'Unknown error occurred',
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
});

// @desc    Start donation process
// @route   POST /api/donations/:id/start
// @access  Private/Medical Admin
router.post('/:id/start', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('phlebotomistId').isMongoId().withMessage('Valid phlebotomist ID is required'),
  body('collectionSite').trim().isLength({ min: 5 }).withMessage('Collection site is required'),
  body('bloodPressure.systolic').isInt({ min: 80, max: 200 }).withMessage('Valid systolic pressure is required'),
  body('bloodPressure.diastolic').isInt({ min: 40, max: 120 }).withMessage('Valid diastolic pressure is required'),
  body('heartRate').isInt({ min: 40, max: 120 }).withMessage('Valid heart rate is required'),
  body('temperature').isFloat({ min: 35, max: 38 }).withMessage('Valid temperature is required'),
  body('hemoglobin').isFloat({ min: 12 }).withMessage('Valid hemoglobin level is required'),
  body('weight').isFloat({ min: 50 }).withMessage('Valid weight is required'),
  body('isEligible').isBoolean().withMessage('Eligibility status is required')
], async (req, res) => {
  try {
    const {
      phlebotomistId,
      collectionSite,
      bloodPressure,
      heartRate,
      temperature,
      hemoglobin,
      weight,
      isEligible,
      healthCheckNotes
    } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (donation.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Donation is not in scheduled status'
      });
    }

    // Update pre-donation health check
    donation.preDonationHealthCheck = {
      bloodPressure,
      heartRate,
      temperature,
      hemoglobin,
      weight,
      isEligible,
      healthCheckNotes,
      performedBy: req.user._id,
      performedAt: new Date()
    };

    if (!isEligible) {
      donation.status = 'cancelled';
      await donation.save();

      // Create notification for donor
      const notification = new Notification({
        userId: donation.donorId,
        title: '❌ Donation Cancelled',
        message: 'Your donation has been cancelled due to health check results',
        type: 'donation',
        priority: 'medium',
        relatedId: donation._id,
        relatedType: 'donation',
        metadata: { reason: 'health_check_failed', notes: healthCheckNotes }
      });

      await notification.save();

      return res.json({
        success: true,
        message: 'Donation cancelled due to health check results',
        data: { donation }
      });
    }

    // Start donation process
    await donation.startDonation(phlebotomistId, collectionSite);

    // Log donation start
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'donation_start',
      resourceType: 'donation',
      resourceId: donation._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Donation process started',
      changes: { before: { status: 'scheduled' }, after: { status: 'in_progress' } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Donation started: ${donation._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Donation process started successfully',
      data: { donation }
    });

  } catch (error) {
    logger.error('Start donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Complete donation
// @route   POST /api/donations/:id/complete
// @access  Private/Medical Admin
router.post('/:id/complete', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('endTime').optional().isISO8601().withMessage('Valid end time is required'),
  body('notes').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const { endTime, notes } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (donation.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Donation is not in progress'
      });
    }

    // Complete donation
    await donation.completeDonation(endTime ? new Date(endTime) : new Date(), notes);

    // Create notification for donor
    const notification = new Notification({
      userId: donation.donorId,
      title: '🎉 Donation Completed!',
      message: 'Thank you for your blood donation. You have saved lives!',
      type: 'donation_completed',
      priority: 'high',
      relatedId: donation._id,
      relatedType: 'donation',
      actionRequired: false,
      metadata: {
        donationType: donation.donationType,
        bloodUnits: donation.bloodUnits,
        duration: donation.donationDuration
      }
    });

    await notification.save();

    // Log donation completion
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'donation_complete',
      resourceType: 'donation',
      resourceId: donation._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Donation completed successfully',
      changes: { before: { status: 'in_progress' }, after: { status: 'completed' } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Donation completed: ${donation._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Donation completed successfully',
      data: { donation }
    });

  } catch (error) {
    logger.error('Complete donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update test results
// @route   POST /api/donations/:id/test
// @access  Private/Medical Admin
router.post('/:id/test', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('testResults').isObject().withMessage('Test results are required'),
  body('testResults.hiv').isIn(['negative', 'positive', 'pending']).withMessage('Valid HIV test result is required'),
  body('testResults.hepatitisB').isIn(['negative', 'positive', 'pending']).withMessage('Valid Hepatitis B test result is required'),
  body('testResults.hepatitisC').isIn(['negative', 'positive', 'pending']).withMessage('Valid Hepatitis C test result is required'),
  body('testResults.syphilis').isIn(['negative', 'positive', 'pending']).withMessage('Valid Syphilis test result is required'),
  body('testResults.malaria').isIn(['negative', 'positive', 'pending']).withMessage('Valid Malaria test result is required')
], async (req, res) => {
  try {
    const { testResults } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (donation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Donation must be completed before testing'
      });
    }

    // Update test results
    await donation.updateTestResults(testResults, req.user._id);

    // Create notification for donor
    const allNegative = Object.values(testResults).every(result => result === 'negative');
    const notification = new Notification({
      userId: donation.donorId,
      title: allNegative ? '✅ Test Results Available' : '❌ Test Results',
      message: allNegative 
        ? 'Your blood has passed all tests and is suitable for transfusion'
        : 'Your blood test results are available. Please contact us for details.',
      type: 'medical_update',
      priority: allNegative ? 'medium' : 'high',
      relatedId: donation._id,
      relatedType: 'donation',
      actionRequired: !allNegative,
      metadata: { testResults, suitableForTransfusion: allNegative }
    });

    await notification.save();

    // Log test results update
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'donation_test',
      resourceType: 'donation',
      resourceId: donation._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Blood test results updated',
      changes: { before: null, after: { testResults, suitableForTransfusion: allNegative } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'high'
    });

    logger.info(`Test results updated: ${donation._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Test results updated successfully',
      data: { donation }
    });

  } catch (error) {
    logger.error('Update test results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Store blood
// @route   POST /api/donations/:id/store
// @access  Private/Medical Admin
router.post('/:id/store', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('storageLocation').trim().isLength({ min: 5 }).withMessage('Storage location is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required')
], async (req, res) => {
  try {
    const { storageLocation, expiryDate } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (donation.status !== 'tested') {
      return res.status(400).json({
        success: false,
        message: 'Blood must be tested before storage'
      });
    }

    if (!donation.bloodTesting.isSuitableForTransfusion) {
      return res.status(400).json({
        success: false,
        message: 'Blood is not suitable for transfusion'
      });
    }

    // Generate batch number
    const batchNumber = generateBatchNumber();

    // Store blood
    await donation.storeBlood(storageLocation, batchNumber, new Date(expiryDate));

    // Log blood storage
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'donation_store',
      resourceType: 'donation',
      resourceId: donation._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Blood stored successfully',
      changes: { before: { status: 'tested' }, after: { status: 'stored', batchNumber } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Blood stored: ${donation._id} with batch ${batchNumber} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Blood stored successfully',
      data: { 
        donation,
        batchNumber,
        expiryDate: new Date(expiryDate)
      }
    });

  } catch (error) {
    logger.error('Store blood error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Distribute blood
// @route   POST /api/donations/:id/distribute
// @access  Private/Medical Admin
router.post('/:id/distribute', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('hospitalName').trim().isLength({ min: 2 }).withMessage('Hospital name is required'),
  body('hospitalId').optional().isMongoId().withMessage('Valid hospital ID is required'),
  body('patientName').trim().isLength({ min: 2 }).withMessage('Patient name is required'),
  body('patientId').optional().trim().isLength({ min: 1 }).withMessage('Patient ID is required')
], async (req, res) => {
  try {
    const { hospitalName, hospitalId, patientName, patientId } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (donation.status !== 'stored') {
      return res.status(400).json({
        success: false,
        message: 'Blood must be stored before distribution'
      });
    }

    // Check if blood is expired
    if (donation.isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Blood has expired and cannot be distributed'
      });
    }

    // Distribute blood
    await donation.distributeBlood(
      { hospitalName, hospitalId },
      { patientName, patientId },
      req.user._id
    );

    // Create notification for donor
    const notification = new Notification({
      userId: donation.donorId,
      title: '💝 Blood Used!',
      message: `Your blood donation has been used to help ${patientName}. You saved a life!`,
      type: 'donation_completed',
      priority: 'high',
      relatedId: donation._id,
      relatedType: 'donation',
      actionRequired: false,
      metadata: {
        patientName,
        hospitalName,
        livesSaved: donation.bloodUnits
      }
    });

    await notification.save();

    // Update donor statistics
    const donor = await User.findById(donation.donorId);
    if (donor) {
      await donor.updateStatistics('donation', donation.bloodUnits);
    }

    // Log blood distribution
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'donation_distribute',
      resourceType: 'donation',
      resourceId: donation._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Blood distributed successfully',
      changes: { before: { status: 'stored' }, after: { status: 'distributed', patientName, hospitalName } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Blood distributed: ${donation._id} to ${patientName} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Blood distributed successfully',
      data: { donation }
    });

  } catch (error) {
    logger.error('Distribute blood error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Add donor feedback
// @route   POST /api/donations/:id/feedback
// @access  Private
router.post('/:id/feedback', [
  protect,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comments').optional().trim().isLength({ max: 500 }),
  body('wouldDonateAgain').isBoolean().withMessage('Would donate again status is required')
], async (req, res) => {
  try {
    const { rating, comments, wouldDonateAgain } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Check if user is the donor
    if (donation.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to provide feedback for this donation'
      });
    }

    // Add feedback
    await donation.addDonorFeedback(rating, comments, wouldDonateAgain);

    // Update donor rating
    await req.user.updateStatistics('rating', rating);

    // Log feedback
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'feedback_submission',
      resourceType: 'donation',
      resourceId: donation._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Donor feedback submitted',
      changes: { before: null, after: { rating, wouldDonateAgain } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Feedback submitted: ${donation._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: { feedback: donation.donorFeedback }
    });

  } catch (error) {
    logger.error('Add feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get donation statistics
// @route   GET /api/donations/statistics
// @access  Private/Admin
router.get('/statistics', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const stats = await Donation.getStatistics();

    res.json({
      success: true,
      data: { statistics: stats }
    });

  } catch (error) {
    logger.error('Get donation statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get donor statistics
// @route   GET /api/donations/donor/:donorId/statistics
// @access  Private
router.get('/donor/:donorId/statistics', protect, async (req, res) => {
  try {
    const { donorId } = req.params;

    // Check if user can view these statistics
    const canView = req.user._id.toString() === donorId || 
                   ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these statistics'
      });
    }

    const stats = await Donation.getDonorStatistics(donorId);

    res.json({
      success: true,
      data: { statistics: stats }
    });

  } catch (error) {
    logger.error('Get donor statistics error:', error);
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

// ===== Recipient Response Endpoints =====

// @desc    Recipient responds to a donation (accept/decline)
// @route   POST /api/donations/:id/respond
// @access  Private/Recipient
router.post('/:id/respond', [
  protect,
  body('response').isIn(['accept', 'decline']).withMessage('Response must be accept or decline'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    if (req.user.role !== 'recipient') {
      return res.status(403).json({ success: false, message: 'Only recipients can respond to donations' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    // Authorization: allow response if donation belongs to recipient's request
    // OR if the donor has responded to any of the recipient's requests (broader association)
    let authorized = false;
    if (donation.requestId) {
      const request = await BloodRequest.findById(donation.requestId).select('requesterId');
      if (request && request.requesterId.toString() === req.user._id.toString()) {
        authorized = true;
      }
    }
    if (!authorized) {
      // Check if donor is among matched donors for any of recipient's requests
      const userRequests = await BloodRequest.find({ requesterId: req.user._id })
        .select('matchedDonors')
        .lean();
      const donorMatch = userRequests.some(r => Array.isArray(r.matchedDonors) && r.matchedDonors.some(m => {
        const donorId = m.donorId?._id || m.donorId;
        return donorId && donorId.toString() === donation.donorId.toString();
      }));
      if (donorMatch) authorized = true;
    }
    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this donation' });
    }

    // Prevent duplicate response from same recipient
    const alreadyResponded = (donation.recipientResponses || []).some(rr => rr.recipientId.toString() === req.user._id.toString());
    if (alreadyResponded) {
      return res.status(409).json({ success: false, message: 'You have already responded to this donation' });
    }

    const { response, notes } = req.body;
    donation.recipientResponses = donation.recipientResponses || [];
    donation.recipientResponses.push({ recipientId: req.user._id, response, notes });
    await donation.save();

    // Log audit
    try {
      await AuditTrail.logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'donation_recipient_response',
        resourceType: 'donation',
        resourceId: donation._id,
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: `Recipient ${response}ed donation`,
        changes: { before: null, after: { response } },
        status: 'success',
        location: await getLocationFromIP(req.ip)
      });
    } catch (e) {
      logger.warn('Failed to log recipient response audit:', e.message);
    }

    return res.json({ success: true, message: 'Response recorded', data: { recipientResponses: donation.recipientResponses } });
  } catch (error) {
    logger.error('Recipient respond error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Admin get recipient responses for a donation
// @route   GET /api/donations/:id/responses
// @access  Private/Admin
router.get('/:id/responses', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('recipientResponses.recipientId', 'firstName lastName email');
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }
    return res.json({ success: true, data: { responses: donation.recipientResponses || [] } });
  } catch (error) {
    logger.error('Get donation responses error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Admin sets recipient review status for a donation
// @route   PUT /api/donations/:id/recipient-review
// @access  Private/Admin
router.put('/:id/recipient-review', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('status').isIn(['accepted', 'declined']).withMessage('Status must be accepted or declined'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    const { status, notes } = req.body;
    donation.recipientReview = {
      status,
      notes,
      decidedBy: req.user._id,
      decidedAt: new Date()
    };
    await donation.save();

    // Log audit
    try {
      await AuditTrail.logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'donation_recipient_review',
        resourceType: 'donation',
        resourceId: donation._id,
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: `Medical admin set recipient review: ${status}`,
        changes: { before: null, after: { status } },
        status: 'success',
        location: await getLocationFromIP(req.ip)
      });
    } catch (e) {
      logger.warn('Failed to log recipient review audit:', e.message);
    }

    return res.json({ success: true, message: 'Recipient review updated', data: { recipientReview: donation.recipientReview } });
  } catch (error) {
    logger.error('Set recipient review error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Admin updates donation status
// @route   PUT /api/donations/:id/status
// @access  Private/Admin
router.put('/:id/status', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('status').isIn(['scheduled','in_progress','completed','tested','stored','distributed','discarded','cancelled']).withMessage('Invalid donation status'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    const previousStatus = donation.status;
    const { status, notes } = req.body;

    donation.status = status;
    if (notes) {
      donation.donationProcess = donation.donationProcess || {};
      donation.donationProcess.notes = notes;
    }
    await donation.save();

    try {
      await AuditTrail.logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'donation_status_update',
        resourceType: 'donation',
        resourceId: donation._id,
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: `Donation status changed from ${previousStatus} to ${status}`,
        changes: { before: { status: previousStatus }, after: { status } },
        status: 'success',
        location: await getLocationFromIP(req.ip)
      });
    } catch (e) {
      logger.warn('Failed to log donation status update audit:', e.message);
    }

    return res.json({ success: true, message: 'Donation status updated', data: { donation } });
  } catch (error) {
    logger.error('Update donation status error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
