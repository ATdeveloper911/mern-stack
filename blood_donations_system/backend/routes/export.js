const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const Donation = require('../models/Donation');
const Notification = require('../models/Notification');
const AuditTrail = require('../models/AuditTrail');
const Analytics = require('../models/Analytics');
const { protect, authorize } = require('../middleware/auth');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Export users data
// @route   POST /api/export/users
// @access  Private/Admin
router.post('/users', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('format').isIn(['csv', 'excel', 'pdf']).withMessage('Valid export format is required'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('fields').optional().isArray().withMessage('Fields must be an array')
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

    const { format, filters = {}, fields = [] } = req.body;

    // Build query filter
    const queryFilter = { isActive: true };
    
    if (filters.role) queryFilter.role = filters.role;
    if (filters.bloodType) queryFilter.bloodType = filters.bloodType;
    if (filters.city) queryFilter['address.city'] = new RegExp(filters.city, 'i');
    if (filters.state) queryFilter['address.state'] = new RegExp(filters.state, 'i');
    if (filters.isVerified) {
      if (filters.isVerified === 'true') {
        queryFilter.isEmailVerified = true;
        queryFilter.isPhoneVerified = true;
        queryFilter.isMedicalVerified = true;
      } else {
        queryFilter.$or = [
          { isEmailVerified: false },
          { isPhoneVerified: false },
          { isMedicalVerified: false }
        ];
      }
    }
    if (filters.startDate || filters.endDate) {
      queryFilter.createdAt = {};
      if (filters.startDate) queryFilter.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) queryFilter.createdAt.$lte = new Date(filters.endDate);
    }

    // Get users data
    const users = await User.find(queryFilter)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .limit(parseInt(process.env.MAX_EXPORT_RECORDS) || 10000);

    // Define default fields if none specified
    const defaultFields = [
      'firstName', 'lastName', 'email', 'phone', 'role', 'bloodType',
      'address.city', 'address.state', 'isEmailVerified', 'isPhoneVerified',
      'isMedicalVerified', 'isAvailable', 'createdAt', 'lastLogin'
    ];

    const exportFields = fields.length > 0 ? fields : defaultFields;

    // Log export action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'data_export',
      resourceType: 'user',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Users data exported in ${format} format`,
      changes: { before: null, after: { format, recordCount: users.length, filters } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    // Export based on format
    switch (format) {
      case 'csv':
        return await exportToCSV(res, users, exportFields, 'users');
      case 'excel':
        return await exportToExcel(res, users, exportFields, 'users');
      case 'pdf':
        return await exportToPDF(res, users, exportFields, 'users');
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
    }

  } catch (error) {
    logger.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Export blood requests data
// @route   POST /api/export/blood-requests
// @access  Private/Admin
router.post('/blood-requests', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('format').isIn(['csv', 'excel', 'pdf']).withMessage('Valid export format is required'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('fields').optional().isArray().withMessage('Fields must be an array')
], async (req, res) => {
  try {
    const { format, filters = {}, fields = [] } = req.body;

    // Build query filter
    const queryFilter = {};
    
    if (filters.bloodType) queryFilter.bloodType = filters.bloodType;
    if (filters.urgency) queryFilter.urgency = filters.urgency;
    if (filters.status) queryFilter.status = filters.status;
    if (filters.city) queryFilter.city = new RegExp(filters.city, 'i');
    if (filters.state) queryFilter.state = new RegExp(filters.state, 'i');
    if (filters.isEmergency !== undefined) queryFilter.isEmergency = filters.isEmergency;
    if (filters.startDate || filters.endDate) {
      queryFilter.createdAt = {};
      if (filters.startDate) queryFilter.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) queryFilter.createdAt.$lte = new Date(filters.endDate);
    }

    // Get blood requests data
    const bloodRequests = await BloodRequest.find(queryFilter)
      .populate('requesterId', 'firstName lastName email')
      .populate('confirmedDonor.donorId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(process.env.MAX_EXPORT_RECORDS) || 10000);

    // Define default fields
    const defaultFields = [
      'patientName', 'patientAge', 'patientBloodType', 'bloodType', 'bloodUnits',
      'urgency', 'hospitalName', 'city', 'state', 'status', 'createdAt',
      'requiredBy', 'completedAt'
    ];

    const exportFields = fields.length > 0 ? fields : defaultFields;

    // Log export action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'data_export',
      resourceType: 'blood_request',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Blood requests data exported in ${format} format`,
      changes: { before: null, after: { format, recordCount: bloodRequests.length, filters } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    // Export based on format
    switch (format) {
      case 'csv':
        return await exportToCSV(res, bloodRequests, exportFields, 'blood-requests');
      case 'excel':
        return await exportToExcel(res, bloodRequests, exportFields, 'blood-requests');
      case 'pdf':
        return await exportToPDF(res, bloodRequests, exportFields, 'blood-requests');
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
    }

  } catch (error) {
    logger.error('Export blood requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Export donations data
// @route   POST /api/export/donations
// @access  Private/Admin
router.post('/donations', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('format').isIn(['csv', 'excel', 'pdf']).withMessage('Valid export format is required'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('fields').optional().isArray().withMessage('Fields must be an array')
], async (req, res) => {
  try {
    const { format, filters = {}, fields = [] } = req.body;

    // Build query filter
    const queryFilter = {};
    
    if (filters.status) queryFilter.status = filters.status;
    if (filters.donationType) queryFilter.donationType = filters.donationType;
    if (filters.bloodType) queryFilter.donorBloodType = filters.bloodType;
    if (filters.startDate || filters.endDate) {
      queryFilter.scheduledDate = {};
      if (filters.startDate) queryFilter.scheduledDate.$gte = new Date(filters.startDate);
      if (filters.endDate) queryFilter.scheduledDate.$lte = new Date(filters.endDate);
    }

    // Get donations data
    const donations = await Donation.find(queryFilter)
      .populate('donorId', 'firstName lastName email bloodType')
      .populate('requestId', 'patientName hospitalName')
      .sort({ createdAt: -1 })
      .limit(parseInt(process.env.MAX_EXPORT_RECORDS) || 10000);

    // Define default fields
    const defaultFields = [
      'donorName', 'donorBloodType', 'donationType', 'bloodUnits',
      'status', 'scheduledDate', 'actualDate', 'collectionSite',
      'bloodTesting.isSuitableForTransfusion', 'storage.batchNumber',
      'impact.livesSaved', 'createdAt'
    ];

    const exportFields = fields.length > 0 ? fields : defaultFields;

    // Log export action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'data_export',
      resourceType: 'donation',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Donations data exported in ${format} format`,
      changes: { before: null, after: { format, recordCount: donations.length, filters } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    // Export based on format
    switch (format) {
      case 'csv':
        return await exportToCSV(res, donations, exportFields, 'donations');
      case 'excel':
        return await exportToExcel(res, donations, exportFields, 'donations');
      case 'pdf':
        return await exportToPDF(res, donations, exportFields, 'donations');
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
    }

  } catch (error) {
    logger.error('Export donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Export audit trail
// @route   POST /api/export/audit-trail
// @access  Private/System Admin
router.post('/audit-trail', [
  protect,
  authorize('system_admin'),
  body('format').isIn(['csv', 'excel', 'pdf']).withMessage('Valid export format is required'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('fields').optional().isArray().withMessage('Fields must be an array')
], async (req, res) => {
  try {
    const { format, filters = {}, fields = [] } = req.body;

    // Build query filter
    const queryFilter = {};
    
    if (filters.userId) queryFilter.userId = filters.userId;
    if (filters.action) queryFilter.action = filters.action;
    if (filters.resourceType) queryFilter.resourceType = filters.resourceType;
    if (filters.status) queryFilter.status = filters.status;
    if (filters.riskLevel) queryFilter.riskLevel = filters.riskLevel;
    if (filters.isSuspicious !== undefined) queryFilter.isSuspicious = filters.isSuspicious;
    if (filters.startDate || filters.endDate) {
      queryFilter.createdAt = {};
      if (filters.startDate) queryFilter.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) queryFilter.createdAt.$lte = new Date(filters.endDate);
    }

    // Get audit trail data
    const auditTrails = await AuditTrail.find(queryFilter)
      .populate('userId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(process.env.MAX_EXPORT_RECORDS) || 10000);

    // Define default fields
    const defaultFields = [
      'userEmail', 'userRole', 'action', 'resourceType', 'description',
      'status', 'riskLevel', 'isSuspicious', 'ipAddress', 'createdAt'
    ];

    const exportFields = fields.length > 0 ? fields : defaultFields;

    // Log export action
    await AuditTrail.logAction({
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'data_export',
      resourceType: 'audit_trail',
      resourceId: null,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: `Audit trail exported in ${format} format`,
      changes: { before: null, after: { format, recordCount: auditTrails.length, filters } },
      status: 'success',
      location: await getLocationFromIP(req.ip),
      riskLevel: 'high'
    });

    // Export based on format
    switch (format) {
      case 'csv':
        return await exportToCSV(res, auditTrails, exportFields, 'audit-trail');
      case 'excel':
        return await exportToExcel(res, auditTrails, exportFields, 'audit-trail');
      case 'pdf':
        return await exportToPDF(res, auditTrails, exportFields, 'audit-trail');
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
    }

  } catch (error) {
    logger.error('Export audit trail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Export analytics report
// @route   POST /api/export/analytics
// @access  Private/Admin
router.post('/analytics', [
  protect,
  authorize('medical_admin', 'system_admin'),
  body('format').isIn(['csv', 'excel', 'pdf']).withMessage('Valid export format is required'),
  body('reportType').isIn(['dashboard', 'user-activity', 'blood-requests', 'donations', 'compliance']).withMessage('Valid report type is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const { format, reportType, startDate, endDate } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate analytics data based on report type
    let reportData;
    let fileName;

    switch (reportType) {
      case 'dashboard':
        reportData = await generateDashboardReport(start, end);
        fileName = 'dashboard-report';
        break;
      case 'user-activity':
        reportData = await generateUserActivityReport(start, end);
        fileName = 'user-activity-report';
        break;
      case 'blood-requests':
        reportData = await generateBloodRequestReport(start, end);
        fileName = 'blood-request-report';
        break;
      case 'donations':
        reportData = await generateDonationReport(start, end);
        fileName = 'donation-report';
        break;
      case 'compliance':
        reportData = await generateComplianceReport(start, end);
        fileName = 'compliance-report';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Log export action
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
      description: `Analytics report exported: ${reportType} in ${format} format`,
      changes: { before: null, after: { format, reportType, startDate, endDate } },
      status: 'success',
      location: await getLocationFromIP(req.ip)
    });

    // Export based on format
    switch (format) {
      case 'csv':
        return await exportToCSV(res, reportData, Object.keys(reportData[0] || {}), fileName);
      case 'excel':
        return await exportToExcel(res, reportData, Object.keys(reportData[0] || {}), fileName);
      case 'pdf':
        return await exportToPDF(res, reportData, Object.keys(reportData[0] || {}), fileName);
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export format'
        });
    }

  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper functions for export formats
const exportToCSV = async (res, data, fields, fileName) => {
  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    throw new Error('CSV export failed');
  }
};

const exportToExcel = async (res, data, fields, fileName) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add headers
    worksheet.addRow(fields);

    // Add data rows
    data.forEach(item => {
      const row = fields.map(field => {
        return getNestedValue(item, field);
      });
      worksheet.addRow(row);
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}-${Date.now()}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    throw new Error('Excel export failed');
  }
};

const exportToPDF = async (res, data, fields, fileName) => {
  try {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}-${Date.now()}.pdf"`);
    
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text(`${fileName.replace('-', ' ').toUpperCase()} REPORT`, 50, 50);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
    doc.moveDown();

    // Add data table
    let yPosition = 120;
    const pageWidth = 550;
    const columnWidth = pageWidth / fields.length;

    // Add headers
    doc.fontSize(10).font('Helvetica-Bold');
    fields.forEach((field, index) => {
      doc.text(field, 50 + (index * columnWidth), yPosition);
    });
    yPosition += 20;

    // Add data rows
    doc.font('Helvetica');
    data.slice(0, 50).forEach((item, rowIndex) => { // Limit to 50 rows for PDF
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      fields.forEach((field, colIndex) => {
        const value = getNestedValue(item, field);
        doc.text(String(value || ''), 50 + (colIndex * columnWidth), yPosition);
      });
      yPosition += 15;
    });

    doc.end();
  } catch (error) {
    throw new Error('PDF export failed');
  }
};

// Helper function to get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
};

// Helper functions for analytics reports
const generateDashboardReport = async (startDate, endDate) => {
  // Implementation for dashboard report
  return [{ message: 'Dashboard report data' }];
};

const generateUserActivityReport = async (startDate, endDate) => {
  // Implementation for user activity report
  return [{ message: 'User activity report data' }];
};

const generateBloodRequestReport = async (startDate, endDate) => {
  // Implementation for blood request report
  return [{ message: 'Blood request report data' }];
};

const generateDonationReport = async (startDate, endDate) => {
  // Implementation for donation report
  return [{ message: 'Donation report data' }];
};

const generateComplianceReport = async (startDate, endDate) => {
  // Implementation for compliance report
  return [{ message: 'Compliance report data' }];
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
