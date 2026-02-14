const express = require('express');
const { body, validationResult } = require('express-validator');
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditTrail = require('../models/AuditTrail');
const { protect, authorize, requireEmailVerification } = require('../middleware/auth');
const EmailService = require('../utils/emailService');
const emailService = new EmailService();
const { generateBloodRequestId, generateTrackingNumber } = require('../utils/generateToken');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get all blood requests
// @route   GET /api/blood-requests
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const {
      bloodType,
      urgency,
      status,
      city,
      state,
      isEmergency,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Filter based on user role
    if (req.user.role === 'donor') {
      // Donors can only see requests with status: confirmed, matched, or fulfilled
      // If status filter is provided, combine with donor status filter using $and
      if (status) {
        // If status filter is provided, check if it's in allowed statuses
        const allowedStatuses = ['confirmed', 'matched', 'fulfilled'];
        if (allowedStatuses.includes(status)) {
          filter.status = status;
        } else {
          // If status is not in allowed list, return empty results
          filter.status = { $in: [] };
        }
      } else {
        filter.status = { $in: ['confirmed', 'matched', 'fulfilled'] };
      }
      logger.info(`Filtering blood requests for donor: ${req.user._id} (${req.user.email}) - showing only confirmed/matched/fulfilled`);
    } else if (!['medical_admin', 'system_admin'].includes(req.user.role)) {
      // Recipients can only see their own requests
      filter.requesterId = req.user._id;
      logger.info(`Filtering blood requests for requester: ${req.user._id} (${req.user.email})`);
    }
    
    if (bloodType) filter.bloodType = bloodType;
    if (urgency) filter.urgency = urgency;
    // Status filter is handled above for donors
    if (status && req.user.role !== 'donor') filter.status = status;
    if (city) filter.city = new RegExp(city, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (isEmergency !== undefined) filter.isEmergency = isEmergency === 'true';
    
    // Handle search - combine with existing filters using $and
    if (search) {
      const searchOr = {
        $or: [
          { patientName: new RegExp(search, 'i') },
          { hospitalName: new RegExp(search, 'i') },
          { doctorName: new RegExp(search, 'i') }
        ]
      };
      
      // Use $and to combine search with existing filters
      const existingFilters = { ...filter };
      filter.$and = [
        existingFilters,
        searchOr
      ];
      // Remove top-level fields that are now in $and[0]
      Object.keys(existingFilters).forEach(key => {
        if (key !== '$and') delete filter[key];
      });
    }

    // Add location-based filtering if coordinates provided (only for admins or public view)
    if (req.query.latitude && req.query.longitude && ['medical_admin', 'system_admin'].includes(req.user.role)) {
      const maxDistance = parseInt(req.query.maxDistance) || 50000; // 50km default
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(req.query.longitude), parseFloat(req.query.latitude)]
          },
          $maxDistance: maxDistance
        }
      };
    }

    // Filter out expired requests (optional - may want to show expired requests for the requester)
    // Only filter expired for non-user requests
    if (['medical_admin', 'system_admin'].includes(req.user.role)) {
      filter.expiresAt = { $gt: new Date() };
    }
    
    // Debug: Check total requests for this user (before filters)
    const totalRequestsForUser = await BloodRequest.countDocuments({ requesterId: req.user._id });
    logger.info(`Total blood requests for user ${req.user._id} (${req.user.email}): ${totalRequestsForUser}`);

    logger.info('Fetching blood requests with filter:', {
      filter: JSON.stringify(filter, null, 2),
      userId: req.user._id,
      role: req.user.role,
      page,
      limit,
      searchTerm: search
    });

    const requests = await BloodRequest.find(filter)
      .populate('requesterId', 'firstName lastName email phone')
      .populate('matchedDonors.donorId', 'firstName lastName phone bloodType')
      .populate('confirmedDonor.donorId', 'firstName lastName phone')
      .sort({ urgency: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BloodRequest.countDocuments(filter);
    
    logger.info(`Found ${requests.length} blood requests out of ${total} total for user ${req.user.email}`);
    
    // Debug: Log first request if exists
    if (requests.length > 0) {
      logger.info(`First request ID: ${requests[0]._id}, Requester ID: ${requests[0].requesterId}, Status: ${requests[0].status}`);
    } else {
      logger.warn(`No blood requests found with filter for user ${req.user.email}`);
      // Try to find any request for debugging
      const anyRequest = await BloodRequest.findOne({ requesterId: req.user._id });
      if (anyRequest) {
        logger.info(`Found a request in DB but not in query result. Request ID: ${anyRequest._id}, Requester ID: ${anyRequest.requesterId}`);
      } else {
        logger.info(`No blood requests exist in DB for user ${req.user._id}`);
      }
    }

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    logger.error('Get blood requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get blood request by ID
// @route   GET /api/blood-requests/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requesterId', 'firstName lastName email phone')
      .populate('matchedDonors.donorId', 'firstName lastName phone bloodType')
      .populate('confirmedDonor.donorId', 'firstName lastName phone')
      .populate('verifiedBy', 'firstName lastName email');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Check if user can view this request
    const canView = req.user._id.toString() === request.requesterId._id.toString() || 
                   ['medical_admin', 'system_admin'].includes(req.user.role) ||
                   request.matchedDonors.some(match => match.donorId._id.toString() === req.user._id.toString());

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    // Increment view count
    request.viewCount += 1;
    await request.save();

    res.json({
      success: true,
      data: { request }
    });

  } catch (error) {
    logger.error('Get blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create blood request
// @route   POST /api/blood-requests
// @access  Private
router.post('/', [
  protect,
  requireEmailVerification,
  body('patientName').trim().isLength({ min: 2 }).withMessage('Patient name is required'),
  body('patientAge').isInt({ min: 0, max: 120 }).withMessage('Valid patient age is required'),
  body('patientGender').isIn(['male', 'female', 'other']).withMessage('Valid patient gender is required'),
  body('patientBloodType').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood type is required'),
  body('hospitalName').trim().isLength({ min: 2 }).withMessage('Hospital name is required'),
  body('hospitalAddress').trim().isLength({ min: 5 }).withMessage('Hospital address is required'),
  body('hospitalPhone').isMobilePhone().withMessage('Valid hospital phone is required'),
  body('doctorName').trim().isLength({ min: 2 }).withMessage('Doctor name is required'),
  body('doctorPhone').isMobilePhone().withMessage('Valid doctor phone is required'),
  body('medicalReason').isIn(['surgery', 'accident', 'disease', 'childbirth', 'cancer', 'other']).withMessage('Valid medical reason is required'),
  body('bloodType').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood type is required'),
  body('bloodUnits').isInt({ min: 1, max: 10 }).withMessage('Blood units must be between 1 and 10'),
  body('bloodGroup').isIn(['whole_blood', 'red_cells', 'platelets', 'plasma']).withMessage('Valid blood group is required'),
  body('urgency').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid urgency level is required'),
  body('requiredBy').isISO8601().withMessage('Required by date is required'),
  body('city').trim().isLength({ min: 2 }).withMessage('City is required'),
  body('state').trim().isLength({ min: 2 }).withMessage('State is required'),
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required')
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
      patientName,
      patientAge,
      patientGender,
      patientBloodType,
      hospitalName,
      hospitalAddress,
      hospitalPhone,
      doctorName,
      doctorPhone,
      medicalReason,
      medicalReasonDescription,
      bloodType,
      bloodUnits,
      bloodGroup,
      urgency,
      requiredBy,
      city,
      state,
      latitude,
      longitude,
      additionalNotes,
      isEmergency
    } = req.body;

    // Check if required by date is in the future
    const requiredByDate = new Date(requiredBy);
    if (requiredByDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Required by date must be in the future'
      });
    }

    // Create blood request
    const bloodRequest = new BloodRequest({
      requesterId: req.user._id,
      requesterName: req.user.fullName,
      requesterPhone: req.user.phone,
      requesterEmail: req.user.email,
      patientName,
      patientAge,
      patientGender,
      patientBloodType,
      hospitalName,
      hospitalAddress,
      hospitalPhone,
      doctorName,
      doctorPhone,
      medicalReason,
      medicalReasonDescription,
      bloodType,
      bloodUnits,
      bloodGroup,
      urgency,
      requiredBy: requiredByDate,
      isEmergency: isEmergency || urgency === 'critical',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      city,
      state,
      additionalNotes,
      status: 'pending'
    });

    await bloodRequest.save();

    // Find compatible donors
    const compatibleBloodTypes = bloodRequest.getCompatibleBloodTypes();
    const maxDistance = 50000; // 50km

    const compatibleDonors = await User.findNearby(
      [parseFloat(longitude), parseFloat(latitude)],
      maxDistance,
      { $in: compatibleBloodTypes }
    );

    // Send notifications to compatible donors
    const notificationPromises = compatibleDonors.slice(0, 20).map(async (donor) => {
      // Create notification
      const notification = new Notification({
        userId: donor._id,
        title: '🚨 Urgent Blood Request',
        message: `${bloodType} blood needed urgently at ${hospitalName}`,
        type: 'blood_request',
        priority: urgency === 'critical' ? 'critical' : 'high',
        isUrgent: urgency === 'critical',
        relatedId: bloodRequest._id,
        relatedType: 'blood_request',
        actionRequired: true,
        actionType: 'respond',
        actionUrl: `/blood-requests/${bloodRequest._id}`,
        metadata: {
          bloodType,
          urgency,
          hospitalName,
          city,
          requiredBy: requiredByDate
        }
      });

      await notification.save();

      // Send email notification
      await emailService.sendBloodRequestAlert(donor, {
        id: bloodRequest._id,
        bloodType,
        location: `${city}, ${state}`,
        urgency,
        requiredBy: requiredByDate.toLocaleDateString(),
        hospitalName
      });

      return notification;
    });

    await Promise.all(notificationPromises);

    // Notify medical admins about new blood request
    try {
      const admins = await User.find({ role: { $in: ['medical_admin', 'system_admin'] }, isActive: true }).select('_id email');
      const adminIds = admins.map(a => a._id);
      if (adminIds.length > 0) {
        const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await Notification.sendToMultipleUsers(adminIds, {
          title: '🆘 New Blood Request Created',
          message: `${bloodType} (${bloodGroup.replace('_',' ')}) units: ${bloodUnits} at ${hospitalName}, ${city}`,
          type: 'blood_request',
          priority: urgency === 'critical' ? 'critical' : 'high',
          isUrgent: urgency === 'critical',
          relatedId: bloodRequest._id,
          relatedType: 'blood_request',
          actionRequired: false,
          metadata: {
            requesterEmail: req.user.email,
            bloodType,
            bloodUnits,
            urgency,
            requiredBy: requiredByDate,
            city,
            state
          },
          sentBy: req.user._id,
          sentBySystem: true,
          expiresAt: in30Days
        });
        logger.info(`Admin notifications created for new blood request: ${adminIds.length} recipients`);
      }
    } catch (e) {
      logger.warn('Failed to notify admins about new blood request:', e.message);
    }

    // Log blood request creation
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'blood_request_create',
      resourceType: 'blood_request',
      resourceId: bloodRequest._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Blood request created',
      changes: { before: null, after: { bloodType, urgency, hospitalName } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: urgency === 'critical' ? 'high' : 'low'
    });

    logger.info(`Blood request created: ${bloodRequest._id} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      data: { request: bloodRequest }
    });

  } catch (error) {
    logger.error('Create blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update blood request
// @route   PUT /api/blood-requests/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Check if user can update this request
    const canUpdate = req.user._id.toString() === request.requesterId.toString() || 
                     ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this request'
      });
    }

    // Check if request can be updated
    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled request'
      });
    }

    // Store original data for audit trail
    const originalData = {
      urgency: request.urgency,
      requiredBy: request.requiredBy,
      additionalNotes: request.additionalNotes,
      status: request.status
    };

    // Update allowed fields
    // Recipients can only update: urgency, requiredBy, additionalNotes, medicalReasonDescription
    // Medical admins can also update: status
    const allowedFields = [
      'urgency', 'requiredBy', 'additionalNotes', 'medicalReasonDescription'
    ];

    // Medical admins can update status
    if (['medical_admin', 'system_admin'].includes(req.user.role)) {
      allowedFields.push('status');
      
      // Validate status if provided
      if (req.body.status && !['pending', 'matched', 'confirmed', 'fulfilled', 'completed', 'cancelled'].includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
      }
      
      // If updating to completed/fulfilled/cancelled, ensure it's allowed
      if (req.body.status && ['completed', 'fulfilled', 'cancelled'].includes(req.body.status)) {
        if (['completed', 'cancelled'].includes(request.status)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot update status of completed or cancelled request'
          });
        }
      }
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        request[field] = req.body[field];
      }
    });

    await request.save();

    // Log request update
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'blood_request_update',
      resourceType: 'blood_request',
      resourceId: request._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Blood request updated',
      changes: { before: originalData, after: req.body },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Blood request updated: ${request._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Blood request updated successfully',
      data: { request }
    });

  } catch (error) {
    logger.error('Update blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Respond to blood request (for donors)
// @route   POST /api/blood-requests/:id/respond
// @access  Private
router.post('/:id/respond', [
  protect,
  requireEmailVerification,
  body('response').isIn(['accept', 'decline']).withMessage('Response must be accept or decline'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { response, notes } = req.body;

    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Check if request is still active (donors can respond to confirmed, matched, or fulfilled)
    if (!['pending', 'matched', 'confirmed', 'fulfilled'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Request is no longer active'
      });
    }

    // Check if user can donate
    const donationCheck = req.user.canDonate();
    if (!donationCheck.canDonate) {
      return res.status(400).json({
        success: false,
        message: donationCheck.reason
      });
    }

    // Check if user has already responded
    const existingResponse = request.matchedDonors.find(
      match => match.donorId.toString() === req.user._id.toString()
    );

    if (existingResponse) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this request'
      });
    }

    if (response === 'accept') {
      // Add donor to matched donors with notes
      const existingMatch = request.matchedDonors.find(match => 
        match.donorId.toString() === req.user._id.toString()
      );
      
      if (!existingMatch) {
        request.matchedDonors.push({
          donorId: req.user._id,
          donorName: req.user.fullName,
          donorPhone: req.user.phone,
          matchedAt: new Date(),
          status: 'accepted',
          notes: notes || ''
        });
        request.responseCount += 1;
        
        if (request.status === 'pending') {
          request.status = 'matched';
        }
        await request.save();
      } else {
        // Update existing response
        existingMatch.status = 'accepted';
        existingMatch.notes = notes || existingMatch.notes || '';
        existingMatch.matchedAt = new Date();
        await request.save();
      }

      // Create notification for requester
      const notification = new Notification({
        userId: request.requesterId,
        title: '✅ Donor Response',
        message: `${req.user.fullName} has accepted your blood request`,
        type: 'donation_match',
        priority: 'medium',
        relatedId: request._id,
        relatedType: 'blood_request',
        actionRequired: true,
        actionType: 'view',
        actionUrl: `/blood-requests/${request._id}`,
        metadata: {
          donorName: req.user.fullName,
          donorPhone: req.user.phone,
          response: 'accepted'
        }
      });

      await notification.save();

      // Log donor response
      await AuditTrail.logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'blood_request_match',
        resourceType: 'blood_request',
        resourceId: request._id,
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: 'Donor accepted blood request',
        changes: { before: null, after: { response: 'accepted' } },
        status: 'success',
        location: await getLocationFromIP(req.ip)
      });

      logger.info(`Donor accepted request: ${request._id} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Response recorded successfully. The requester will be notified.',
        data: { response: 'accepted' }
      });

    } else if (response === 'decline') {
      // Store decline response in matchedDonors for tracking
      const existingMatch = request.matchedDonors.find(match => 
        match.donorId.toString() === req.user._id.toString()
      );
      
      if (!existingMatch) {
        request.matchedDonors.push({
          donorId: req.user._id,
          donorName: req.user.fullName,
          donorPhone: req.user.phone,
          matchedAt: new Date(),
          status: 'declined',
          notes: notes || ''
        });
        request.responseCount += 1;
        await request.save();
      } else {
        // Update existing response
        existingMatch.status = 'declined';
        existingMatch.notes = notes || existingMatch.notes || '';
        existingMatch.matchedAt = new Date();
        await request.save();
      }

      // Log decline response
      await AuditTrail.logAction({
        userId: req.user._id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'blood_request_decline',
        resourceType: 'blood_request',
        resourceId: request._id,
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: 'Donor declined blood request',
        changes: { before: null, after: { response: 'declined', notes } },
        status: 'success',
        location: await getLocationFromIP(req.ip)
      });

      logger.info(`Donor declined request: ${request._id} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Response recorded successfully',
        data: { response: 'declined' }
      });
    }

  } catch (error) {
    logger.error('Respond to blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Confirm donor for blood request
// @route   POST /api/blood-requests/:id/confirm-donor
// @access  Private
router.post('/:id/confirm-donor', [
  protect,
  body('donorId').isMongoId().withMessage('Valid donor ID is required'),
  body('donationDate').isISO8601().withMessage('Valid donation date is required'),
  body('donationTime').trim().isLength({ min: 1 }).withMessage('Donation time is required'),
  body('donationLocation').trim().isLength({ min: 5 }).withMessage('Donation location is required')
], async (req, res) => {
  try {
    const { donorId, donationDate, donationTime, donationLocation } = req.body;

    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Check if user can confirm donor
    const canConfirm = req.user._id.toString() === request.requesterId.toString() || 
                      ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canConfirm) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm donor'
      });
    }

    // Check if donor is in matched donors
    const matchedDonor = request.matchedDonors.find(
      match => match.donorId.toString() === donorId
    );

    if (!matchedDonor) {
      return res.status(400).json({
        success: false,
        message: 'Donor not found in matched donors'
      });
    }

    // Confirm donor
    await request.confirmDonor(donorId, donationDate, donationTime, donationLocation);

    // Create notification for confirmed donor
    const donor = await User.findById(donorId);
    const notification = new Notification({
      userId: donorId,
      title: '🎉 Donation Confirmed!',
      message: `Your donation has been confirmed for ${request.patientName}`,
      type: 'donation_confirmed',
      priority: 'high',
      relatedId: request._id,
      relatedType: 'blood_request',
      actionRequired: true,
      actionType: 'view',
      actionUrl: `/blood-requests/${request._id}`,
      metadata: {
        patientName: request.patientName,
        donationDate,
        donationTime,
        donationLocation
      }
    });

    await notification.save();

    // Log donor confirmation
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'blood_request_confirm',
      resourceType: 'blood_request',
      resourceId: request._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Donor confirmed for blood request',
      changes: { before: null, after: { donorId, donationDate, donationTime } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Donor confirmed for request: ${request._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Donor confirmed successfully',
      data: { request }
    });

  } catch (error) {
    logger.error('Confirm donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Complete blood request
// @route   POST /api/blood-requests/:id/complete
// @access  Private
router.post('/:id/complete', [
  protect,
  body('actualUnits').isInt({ min: 0 }).withMessage('Actual units received is required'),
  body('notes').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const { actualUnits, notes } = req.body;

    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Check if user can complete request
    const canComplete = req.user._id.toString() === request.requesterId.toString() || 
                       ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canComplete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this request'
      });
    }

    // Complete request
    await request.completeRequest(actualUnits, notes);

    // Update donor statistics
    if (request.confirmedDonor && request.confirmedDonor.donorId) {
      const donor = await User.findById(request.confirmedDonor.donorId);
      if (donor) {
        await donor.updateStatistics('donation', actualUnits);
      }
    }

    // Update requester statistics
    await req.user.updateStatistics('request', 1);

    // Log request completion
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'blood_request_complete',
      resourceType: 'blood_request',
      resourceId: request._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Blood request completed',
      changes: { before: { status: 'confirmed' }, after: { status: 'completed', actualUnits } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Blood request completed: ${request._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Blood request completed successfully',
      data: { request }
    });

  } catch (error) {
    logger.error('Complete blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Cancel blood request
// @route   POST /api/blood-requests/:id/cancel
// @access  Private
router.post('/:id/cancel', [
  protect,
  body('reason').trim().isLength({ min: 5 }).withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const { reason } = req.body;

    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Check if user can cancel request
    const canCancel = req.user._id.toString() === request.requesterId.toString() || 
                     ['medical_admin', 'system_admin'].includes(req.user.role);

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request'
      });
    }

    // Check if request can be cancelled
    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be cancelled'
      });
    }

    // Cancel request
    request.status = 'cancelled';
    request.completionNotes = reason;
    await request.save();

    // Notify matched donors
    const notificationPromises = request.matchedDonors.map(async (match) => {
      const notification = new Notification({
        userId: match.donorId,
        title: 'Request Cancelled',
        message: `The blood request you responded to has been cancelled`,
        type: 'blood_request',
        priority: 'medium',
        relatedId: request._id,
        relatedType: 'blood_request',
        metadata: { reason }
      });

      return notification.save();
    });

    await Promise.all(notificationPromises);

    // Log request cancellation
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'blood_request_cancel',
      resourceType: 'blood_request',
      resourceId: request._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Blood request cancelled',
      changes: { before: { status: request.status }, after: { status: 'cancelled', reason } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Blood request cancelled: ${request._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Blood request cancelled successfully',
      data: { request }
    });

  } catch (error) {
    logger.error('Cancel blood request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get blood request statistics
// @route   GET /api/blood-requests/statistics
// @access  Private/Admin
router.get('/statistics', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const stats = await BloodRequest.getStatistics();

    res.json({
      success: true,
      data: { statistics: stats }
    });

  } catch (error) {
    logger.error('Get blood request statistics error:', error);
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
