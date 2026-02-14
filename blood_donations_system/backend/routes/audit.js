const express = require('express');
const { body } = require('express-validator');
const AuditTrail = require('../models/AuditTrail');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get audit trail
// @route   GET /api/audit
// @access  Private/Admin
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const {
      userId,
      action,
      resourceType,
      status,
      riskLevel,
      isSuspicious,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (isSuspicious !== undefined) filter.isSuspicious = isSuspicious === 'true';
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { userEmail: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { ipAddress: new RegExp(search, 'i') }
      ];
    }

    const auditTrails = await AuditTrail.find(filter)
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AuditTrail.countDocuments(filter);

    res.json({
      success: true,
      data: {
        auditTrails,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    logger.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get audit trail by ID
// @route   GET /api/audit/:id
// @access  Private/Admin
router.get('/:id', protect, async (req, res) => {
  try {
    const auditTrail = await AuditTrail.findById(req.params.id)
      .populate('userId', 'firstName lastName email role');

    if (!auditTrail) {
      return res.status(404).json({
        success: false,
        message: 'Audit trail not found'
      });
    }

    res.json({
      success: true,
      data: { auditTrail }
    });

  } catch (error) {
    logger.error('Get audit trail by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user activity
// @route   GET /api/audit/user/:userId
// @access  Private/Admin
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const userActivity = await AuditTrail.getUserActivity(userId, limit);

    res.json({
      success: true,
      data: { userActivity }
    });

  } catch (error) {
    logger.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get suspicious activities
// @route   GET /api/audit/suspicious
// @access  Private/Admin
router.get('/suspicious', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const suspiciousActivities = await AuditTrail.getSuspiciousActivities(limit);

    res.json({
      success: true,
      data: { suspiciousActivities }
    });

  } catch (error) {
    logger.error('Get suspicious activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get security alerts
// @route   GET /api/audit/security-alerts
// @access  Private/Admin
router.get('/security-alerts', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const securityAlerts = await AuditTrail.getSecurityAlerts(days);

    res.json({
      success: true,
      data: { securityAlerts }
    });

  } catch (error) {
    logger.error('Get security alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get compliance report
// @route   GET /api/audit/compliance-report
// @access  Private/Admin
router.get('/compliance-report', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const complianceReport = await AuditTrail.getComplianceReport(start, end);

    res.json({
      success: true,
      data: { complianceReport }
    });

  } catch (error) {
    logger.error('Get compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Mark audit entry as suspicious
// @route   PUT /api/audit/:id/mark-suspicious
// @access  Private/Admin
router.put('/:id/mark-suspicious', [
  protect,
  body('reason').trim().isLength({ min: 5 }).withMessage('Reason is required')
], async (req, res) => {
  try {
    const { reason } = req.body;

    const auditTrail = await AuditTrail.findById(req.params.id);

    if (!auditTrail) {
      return res.status(404).json({
        success: false,
        message: 'Audit trail not found'
      });
    }

    await auditTrail.markAsSuspicious(reason);

    // Log the action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'security_alert',
      resourceType: 'audit_trail',
      resourceId: auditTrail._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Audit entry marked as suspicious: ${reason}`,
      changes: { before: { isSuspicious: false }, after: { isSuspicious: true, reason } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'high'
    });

    res.json({
      success: true,
      message: 'Audit entry marked as suspicious',
      data: { auditTrail }
    });

  } catch (error) {
    logger.error('Mark audit entry as suspicious error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update risk level
// @route   PUT /api/audit/:id/risk-level
// @access  Private/Admin
router.put('/:id/risk-level', [
  protect,
  body('riskLevel').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid risk level is required'),
  body('reason').optional().trim().isLength({ min: 5 })
], async (req, res) => {
  try {
    const { riskLevel, reason } = req.body;

    const auditTrail = await AuditTrail.findById(req.params.id);

    if (!auditTrail) {
      return res.status(404).json({
        success: false,
        message: 'Audit trail not found'
      });
    }

    const originalRiskLevel = auditTrail.riskLevel;
    await auditTrail.updateRiskLevel(riskLevel, reason);

    // Log the action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'security_alert',
      resourceType: 'audit_trail',
      resourceId: auditTrail._id,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Risk level updated from ${originalRiskLevel} to ${riskLevel}${reason ? `: ${reason}` : ''}`,
      changes: { before: { riskLevel: originalRiskLevel }, after: { riskLevel, reason } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'medium'
    });

    res.json({
      success: true,
      message: 'Risk level updated successfully',
      data: { auditTrail }
    });

  } catch (error) {
    logger.error('Update risk level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Cleanup old audit entries
// @route   DELETE /api/audit/cleanup
// @access  Private/System Admin
router.delete('/cleanup', protect, async (req, res) => {
  try {
    const result = await AuditTrail.cleanupOldEntries();

    // Log cleanup action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'system_cleanup',
      resourceType: 'audit_trail',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'Old audit entries cleaned up',
      changes: { before: null, after: { deletedCount: result.deletedCount } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'medium'
    });

    logger.info(`Old audit entries cleaned up by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Old audit entries cleaned up successfully',
      data: { deletedCount: result.deletedCount }
    });

  } catch (error) {
    logger.error('Cleanup old audit entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get audit statistics
// @route   GET /api/audit/statistics
// @access  Private/Admin
router.get('/statistics', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await AuditTrail.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
          },
          suspiciousActivities: {
            $sum: { $cond: ['$isSuspicious', 1, 0] }
          },
          highRiskActivities: {
            $sum: { $cond: [{ $in: ['$riskLevel', ['high', 'critical']] }, 1, 0] }
          },
          byAction: {
            $push: {
              action: '$action',
              status: '$status',
              riskLevel: '$riskLevel'
            }
          }
        }
      }
    ]);

    // Process action statistics
    const actionStats = {};
    if (stats.length > 0 && stats[0].byAction) {
      stats[0].byAction.forEach(entry => {
        if (!actionStats[entry.action]) {
          actionStats[entry.action] = { total: 0, success: 0, failure: 0, highRisk: 0 };
        }
        actionStats[entry.action].total++;
        if (entry.status === 'success') actionStats[entry.action].success++;
        if (entry.status === 'failure') actionStats[entry.action].failure++;
        if (['high', 'critical'].includes(entry.riskLevel)) actionStats[entry.action].highRisk++;
      });
    }

    const result = stats[0] || {
      totalEntries: 0,
      successfulActions: 0,
      failedActions: 0,
      suspiciousActivities: 0,
      highRiskActivities: 0
    };

    result.actionStatistics = actionStats;
    delete result.byAction;

    res.json({
      success: true,
      data: { statistics: result }
    });

  } catch (error) {
    logger.error('Get audit statistics error:', error);
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
