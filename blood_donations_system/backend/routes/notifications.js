const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AuditTrail = require('../models/AuditTrail');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    let {
      type,
      priority,
      isRead,
      isUrgent,
      startDate,
      endDate,
      status
    } = req.query;

    // Backward compatibility: map status to isRead if provided (status=read|unread)
    if (status && (status === 'read' || status === 'unread') && isRead === undefined) {
      isRead = status === 'read' ? 'true' : 'false';
    }

    // Build filter object: admins see system-wide recent notifications; others see their own
    const isAdmin = ['medical_admin', 'system_admin'].includes(req.user.role);
    const filter = { $and: [] };
    if (!isAdmin) {
      filter.$and.push({ userId: req.user._id });
    }
    
    // For non-admin roles, exclude expired notifications. Admins see all
    // Exclude expired unless expiresAt is null/absent
    filter.$and.push({
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } },
        { expiresAt: null }
      ]
    });

    // Add other filters to the $and array
    if (type) filter.$and.push({ type });
    if (priority) filter.$and.push({ priority });
    if (isRead !== undefined) filter.$and.push({ isRead: isRead === 'true' });
    if (isUrgent !== undefined) filter.$and.push({ isUrgent: isUrgent === 'true' });
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      filter.$and.push({ createdAt: dateFilter });
    }

    logger.info(`Fetching notifications for user ${req.user._id} (${req.user.email}) with filter:`, JSON.stringify(filter, null, 2));

    const criteria = filter.$and.length ? filter : {};
    const notifications = await Notification.find(criteria)
      .populate('relatedId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(criteria);
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    logger.info(`Found ${notifications.length} notifications out of ${total} total for user ${req.user._id}`);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('relatedId');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      data: { notification }
    });

  } catch (error) {
    logger.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership or admin override
    const isAdmin = ['medical_admin', 'system_admin'].includes(req.user.role);
    if (!isAdmin && notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    await notification.markAsRead();

    // Log notification read
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'notification_read',
      resourceType: 'notification',
      resourceId: notification._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Notification marked as read',
      changes: { before: { isRead: false }, after: { isRead: true } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });

  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark notification as unread
// @route   PUT /api/notifications/:id/unread
// @access  Private
router.put('/:id/unread', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership or admin override
    const isAdmin = ['medical_admin', 'system_admin'].includes(req.user.role);
    if (!isAdmin && notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    await notification.markAsUnread();

    res.json({
      success: true,
      message: 'Notification marked as unread',
      data: { notification }
    });

  } catch (error) {
    logger.error('Mark notification as unread error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user._id);

    // Log bulk read action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'notification_read',
      resourceType: 'notification',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'All notifications marked as read',
      changes: null,
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    // Log notification deletion
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'notification_delete',
      resourceType: 'notification',
      resourceId: notification._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Notification deleted',
      changes: { before: { title: notification.title }, after: null },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get notifications by type
// @route   GET /api/notifications/type/:type
// @access  Private
router.get('/type/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.getByType(req.user._id, type, limit);

    res.json({
      success: true,
      data: { notifications }
    });

  } catch (error) {
    logger.error('Get notifications by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Send notification (Admin only)
// @route   POST /api/notifications/send
// @access  Private/Admin
router.post('/send', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message is required'),
  body('type').isIn([
    'blood_request', 'donation_match', 'donation_confirmed', 'donation_completed',
    'emergency_alert', 'system_announcement', 'verification', 'reminder',
    'feedback_request', 'appointment', 'medical_update', 'security_alert'
  ]).withMessage('Valid notification type is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('isUrgent').optional().isBoolean(),
  body('actionRequired').optional().isBoolean(),
  body('actionType').optional().isIn(['view', 'respond', 'confirm', 'decline', 'complete', 'verify']),
  body('actionUrl').optional().isURL()
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
      userIds,
      title,
      message,
      type,
      priority = 'medium',
      isUrgent = false,
      actionRequired = false,
      actionType,
      actionUrl,
      metadata = {}
    } = req.body;

    // Verify all users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some user IDs are invalid'
      });
    }

    // Create notifications
    const notifications = await Notification.sendToMultipleUsers(userIds, {
      title,
      message,
      type,
      priority,
      isUrgent,
      actionRequired,
      actionType,
      actionUrl,
      metadata,
      sentBy: req.user._id,
      sentBySystem: false
    });

    // Log notification sending
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'notification_send',
      resourceType: 'notification',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Notification sent to ${userIds.length} users`,
      changes: { before: null, after: { title, type, recipientCount: userIds.length } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Notification sent to ${userIds.length} users by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: `Notification sent to ${userIds.length} users successfully`,
      data: { notifications }
    });

  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Send system announcement (Admin only)
// @route   POST /api/notifications/announcement
// @access  Private/Admin
router.post('/announcement', [
  protect,
  authorize('system_admin'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('targetRoles').optional().isArray().withMessage('Target roles must be an array'),
  body('targetBloodTypes').optional().isArray().withMessage('Target blood types must be an array'),
  body('targetCities').optional().isArray().withMessage('Target cities must be an array')
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
      title,
      message,
      priority = 'medium',
      targetRoles,
      targetBloodTypes,
      targetCities
    } = req.body;

    // Build user filter
    const userFilter = { isActive: true };
    
    if (targetRoles && targetRoles.length > 0) {
      userFilter.role = { $in: targetRoles };
    }
    
    if (targetBloodTypes && targetBloodTypes.length > 0) {
      userFilter.bloodType = { $in: targetBloodTypes };
    }
    
    if (targetCities && targetCities.length > 0) {
      userFilter['address.city'] = { $in: targetCities };
    }

    // Get target users
    const users = await User.find(userFilter).select('_id');
    const userIds = users.map(user => user._id);

    if (userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found matching the criteria'
      });
    }

    // Create system announcement notifications
    const notifications = await Notification.sendToMultipleUsers(userIds, {
      title,
      message,
      type: 'system_announcement',
      priority,
      isUrgent: priority === 'critical',
      actionRequired: false,
      metadata: {
        announcementType: 'system',
        targetCriteria: {
          roles: targetRoles,
          bloodTypes: targetBloodTypes,
          cities: targetCities
        }
      },
      sentBy: req.user._id,
      sentBySystem: true
    });

    // Log system announcement
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'system_announcement',
      resourceType: 'notification',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `System announcement sent to ${userIds.length} users`,
      changes: { before: null, after: { title, priority, recipientCount: userIds.length } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'medium'
    });

    logger.info(`System announcement sent to ${userIds.length} users by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: `System announcement sent to ${userIds.length} users successfully`,
      data: { 
        notifications,
        recipientCount: userIds.length,
        targetCriteria: {
          roles: targetRoles,
          bloodTypes: targetBloodTypes,
          cities: targetCities
        }
      }
    });

  } catch (error) {
    logger.error('Send system announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get notification statistics (Admin only)
// @route   GET /api/notifications/statistics
// @access  Private/Admin
router.get('/statistics', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Notification.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          totalRead: { $sum: { $cond: ['$isRead', 1, 0] } },
          totalUnread: { $sum: { $cond: ['$isRead', 0, 1] } },
          totalUrgent: { $sum: { $cond: ['$isUrgent', 1, 0] } },
          byType: {
            $push: {
              type: '$type',
              priority: '$priority',
              isRead: '$isRead'
            }
          }
        }
      }
    ]);

    // Process type statistics
    const typeStats = {};
    if (stats.length > 0 && stats[0].byType) {
      stats[0].byType.forEach(notification => {
        if (!typeStats[notification.type]) {
          typeStats[notification.type] = { total: 0, read: 0, unread: 0 };
        }
        typeStats[notification.type].total++;
        if (notification.isRead) {
          typeStats[notification.type].read++;
        } else {
          typeStats[notification.type].unread++;
        }
      });
    }

    const result = stats[0] || {
      totalNotifications: 0,
      totalRead: 0,
      totalUnread: 0,
      totalUrgent: 0
    };

    result.typeStatistics = typeStats;
    delete result.byType;

    res.json({
      success: true,
      data: { statistics: result }
    });

  } catch (error) {
    logger.error('Get notification statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Cleanup expired notifications (Admin only)
// @route   DELETE /api/notifications/cleanup
// @access  Private/Admin
router.delete('/cleanup', protect, authorize('system_admin'), async (req, res) => {
  try {
    const result = await Notification.cleanupExpired();

    // Log cleanup action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'system_cleanup',
      resourceType: 'notification',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Expired notifications cleaned up',
      changes: { before: null, after: { deletedCount: result.deletedCount } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    logger.info(`Expired notifications cleaned up by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Expired notifications cleaned up successfully',
      data: { deletedCount: result.deletedCount }
    });

  } catch (error) {
    logger.error('Cleanup expired notifications error:', error);
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
