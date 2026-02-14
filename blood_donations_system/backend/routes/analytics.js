const express = require('express');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Donation = require('../models/Donation');
const Notification = require('../models/Notification');
const AuditTrail = require('../models/AuditTrail');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get basic statistics
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalRequests,
      completedRequests,
      totalDonations,
      successfulDonations,
      totalNotifications,
      unreadNotifications
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
        status: 'completed'
      }),
      Donation.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Donation.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'distributed'
      }),
      Notification.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Notification.countDocuments({ 
        userId: req.user._id,
        isRead: false,
        expiresAt: { $gt: new Date() }
      })
    ]);

    // Calculate success rates
    const requestSuccessRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;
    const donationSuccessRate = totalDonations > 0 ? (successfulDonations / totalDonations) * 100 : 0;

    // Get blood type distribution
    const bloodTypeDistribution = await User.aggregate([
      { $match: { isActive: true } },
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

    // Get geographic distribution
    const geographicDistribution = await BloodRequest.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { city: '$city', state: '$state' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get recent activity
    const recentActivity = await AuditTrail.find({
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('action description createdAt userId userEmail');

    // Get trend data for charts
    const trendData = await getTrendData(startDate, endDate);

    const dashboardData = {
      overview: {
        totalUsers,
        activeUsers,
        newUsers,
        totalRequests,
        completedRequests,
        totalDonations,
        successfulDonations,
        requestSuccessRate: Math.round(requestSuccessRate * 100) / 100,
        donationSuccessRate: Math.round(donationSuccessRate * 100) / 100
      },
      distributions: {
        bloodType: bloodTypeDistribution,
        urgency: urgencyDistribution,
        geographic: geographicDistribution
      },
      recentActivity,
      trendData,
      userSpecific: {
        unreadNotifications
      }
    };

    res.json({
      success: true,
      data: { dashboard: dashboardData }
    });

  } catch (error) {
    logger.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user activity analytics
// @route   GET /api/analytics/user-activity
// @access  Private/Admin
router.get('/user-activity', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await Analytics.generateUserActivity(start, end);
    await analytics.save();

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Get user activity analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get blood request trends
// @route   GET /api/analytics/blood-request-trends
// @access  Private/Admin
router.get('/blood-request-trends', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await Analytics.generateBloodRequestTrends(start, end);
    await analytics.save();

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Get blood request trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get geographic distribution
// @route   GET /api/analytics/geographic-distribution
// @access  Private/Admin
router.get('/geographic-distribution', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await Analytics.generateGeographicDistribution(start, end);
    await analytics.save();

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Get geographic distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get predictive analysis
// @route   GET /api/analytics/predictive
// @access  Private/Admin
router.get('/predictive', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const analytics = await Analytics.generatePredictiveAnalysis();
    await analytics.save();

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Get predictive analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get analytics summary
// @route   GET /api/analytics/summary
// @access  Private/Admin
router.get('/summary', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    
    const analytics = await Analytics.getAnalyticsSummary(period, parseInt(limit));

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Get analytics summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get performance metrics
// @route   GET /api/analytics/performance
// @access  Private/Admin
router.get('/performance', protect, authorize('system_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get system performance metrics
    const performanceMetrics = await getPerformanceMetrics(start, end);

    res.json({
      success: true,
      data: { performance: performanceMetrics }
    });

  } catch (error) {
    logger.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get compliance metrics
// @route   GET /api/analytics/compliance
// @access  Private/Admin
router.get('/compliance', protect, authorize('system_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const complianceReport = await AuditTrail.getComplianceReport(start, end);

    res.json({
      success: true,
      data: { compliance: complianceReport }
    });

  } catch (error) {
    logger.error('Get compliance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user engagement metrics
// @route   GET /api/analytics/engagement
// @access  Private/Admin
router.get('/engagement', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get user engagement metrics
    const engagementMetrics = await getUserEngagementMetrics(start, end);

    res.json({
      success: true,
      data: { engagement: engagementMetrics }
    });

  } catch (error) {
    logger.error('Get user engagement metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Generate custom report
// @route   POST /api/analytics/custom-report
// @access  Private/Admin
router.post('/custom-report', protect, authorize('medical_admin', 'system_admin'), async (req, res) => {
  try {
    const {
      reportType,
      startDate,
      endDate,
      filters = {},
      groupBy = [],
      metrics = []
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate custom report based on type
    let reportData;
    
    switch (reportType) {
      case 'user_activity':
        reportData = await generateUserActivityReport(start, end, filters, groupBy, metrics);
        break;
      case 'blood_requests':
        reportData = await generateBloodRequestReport(start, end, filters, groupBy, metrics);
        break;
      case 'donations':
        reportData = await generateDonationReport(start, end, filters, groupBy, metrics);
        break;
      case 'notifications':
        reportData = await generateNotificationReport(start, end, filters, groupBy, metrics);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Log report generation
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'data_export',
      resourceType: 'analytics',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Custom ${reportType} report generated`,
      changes: { before: null, after: { reportType, filters, groupBy, metrics } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    res.json({
      success: true,
      data: { report: reportData }
    });

  } catch (error) {
    logger.error('Generate custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper functions
const getTrendData = async (startDate, endDate) => {
  const trends = await BloodRequest.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        requests: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  return trends;
};

const getPerformanceMetrics = async (startDate, endDate) => {
  // This would typically include system performance metrics
  // For now, we'll return basic metrics
  return {
    averageResponseTime: 150, // ms
    errorRate: 0.5, // percentage
    uptime: 99.9, // percentage
    throughput: 1000, // requests per minute
    activeConnections: 50
  };
};

const getUserEngagementMetrics = async (startDate, endDate) => {
  const engagement = await User.aggregate([
    {
      $match: {
        lastActivity: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalActiveUsers: { $sum: 1 },
        averageSessionDuration: { $avg: '$lastActivity' },
        newUsers: {
          $sum: { $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0] }
        }
      }
    }
  ]);

  return engagement[0] || {
    totalActiveUsers: 0,
    averageSessionDuration: 0,
    newUsers: 0
  };
};

const generateUserActivityReport = async (startDate, endDate, filters, groupBy, metrics) => {
  // Implementation for user activity report
  return { message: 'User activity report generated' };
};

const generateBloodRequestReport = async (startDate, endDate, filters, groupBy, metrics) => {
  // Implementation for blood request report
  return { message: 'Blood request report generated' };
};

const generateDonationReport = async (startDate, endDate, filters, groupBy, metrics) => {
  // Implementation for donation report
  return { message: 'Donation report generated' };
};

const generateNotificationReport = async (startDate, endDate, filters, groupBy, metrics) => {
  // Implementation for notification report
  return { message: 'Notification report generated' };
};

const getLocationFromIP = async (ipAddress) => {
  // In a real implementation, you would use a geolocation service
  return {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown'
  };
};

module.exports = router;
