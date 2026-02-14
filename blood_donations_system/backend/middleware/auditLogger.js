const mongoose = require('mongoose');
const AuditTrail = require('../models/AuditTrail');
const logger = require('../utils/logger');

const auditLogger = async (req, res, next) => {
  const startTime = Date.now();
  
  // Store original res.json to capture response
  const originalJson = res.json;
  let responseBody = null;
  
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Override res.end to capture the response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Log audit trail after response is sent
    setImmediate(async () => {
      try {
        await logAuditTrail(req, res, startTime, responseBody);
      } catch (error) {
        logger.error('Error logging audit trail:', error);
      }
    });
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

const logAuditTrail = async (req, res, startTime, responseBody) => {
  try {
    // Skip logging for certain paths
    const skipPaths = ['/health', '/favicon.ico', '/api/analytics'];
    if (skipPaths.some(path => req.path.includes(path))) {
      return;
    }
    
    // Extract user information
    let userId = null;
    let userEmail = 'anonymous@system.local';
    let userRole = 'donor'; // Default to a valid enum value
    
    if (req.user) {
      userId = req.user.id;
      userEmail = req.user.email;
      userRole = req.user.role;
    }
    
    // Determine action based on method and path
    const action = determineAction(req.method, req.path);
    
    // Determine resource type and ID
    const { resourceType, resourceId } = determineResource(req.path, req.params);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Determine status
    const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
    
    // Extract IP address
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Extract user agent
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // Determine risk level
    const riskLevel = determineRiskLevel(req, res, responseBody);
    
    // Skip logging if no userId and it's not a public endpoint
    const publicEndpoints = ['/api/auth/register', '/api/auth/login', '/api/auth/forgot-password'];
    if (!userId && !publicEndpoints.some(endpoint => req.path.includes(endpoint))) {
      return;
    }
    
    // For public endpoints without userId, create a system user entry
    if (!userId) {
      // Create a temporary system user ID for anonymous actions
      userId = new mongoose.Types.ObjectId();
    }
    
    // Prepare audit data
    const auditData = {
      userId,
      userEmail,
      userRole,
      action,
      resourceType,
      resourceId,
      requestId: req.id || null,
      ipAddress,
      userAgent,
      sessionId: req.sessionID || null,
      description: generateDescription(req, res, responseBody),
      changes: extractChanges(req, responseBody),
      status,
      errorMessage: status === 'failure' ? responseBody?.error || responseBody?.message : null,
      location: await getLocationFromIP(ipAddress),
      metadata: {
        method: req.method,
        path: req.path,
        query: req.query,
        responseTime,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length') || 0
      },
      riskLevel
    };
    
    // Log to audit trail
    await AuditTrail.logAction(auditData);
    
  } catch (error) {
    logger.error('Error in audit logging:', error);
  }
};

const determineAction = (method, path) => {
  const pathSegments = path.split('/').filter(segment => segment);
  
  // Authentication actions
  if (path.includes('/auth/login')) return 'login';
  if (path.includes('/auth/logout')) return 'logout';
  if (path.includes('/auth/register')) return 'register';
  if (path.includes('/auth/password-reset')) return 'password_reset';
  if (path.includes('/auth/verify-email')) return 'email_verification';
  
  // User actions - Admin routes first (more specific)
  if (path.includes('/admin/users') && method === 'GET') {
    // Admin viewing users list
    return 'profile_view'; // Now valid in enum
  }
  if (path.includes('/admin/users') && method === 'POST') {
    return 'user_create';
  }
  if (path.includes('/admin/users') && method === 'PUT') {
    return 'user_update';
  }
  if (path.includes('/admin/users') && method === 'DELETE') {
    return 'user_delete';
  }
  if (path.includes('/users') && method === 'PUT') return 'profile_update';
  if (path.includes('/users') && method === 'PATCH') return 'profile_update';
  if (path.includes('/users') && method === 'GET') return 'profile_view';
  if (path.includes('/users') && method === 'DELETE') return 'user_delete';
  
  // Blood request actions
  if (path.includes('/blood-requests') && method === 'POST') return 'blood_request_create';
  if (path.includes('/blood-requests') && method === 'PUT') return 'blood_request_update';
  if (path.includes('/blood-requests') && method === 'PATCH') return 'blood_request_update';
  if (path.includes('/blood-requests') && method === 'DELETE') return 'blood_request_delete';
  if (path.includes('/blood-requests') && method === 'GET') return 'blood_request_view';
  if (path.includes('/blood-requests') && path.includes('/match')) return 'blood_request_match';
  if (path.includes('/blood-requests') && path.includes('/confirm')) return 'blood_request_confirm';
  if (path.includes('/blood-requests') && path.includes('/complete')) return 'blood_request_complete';
  if (path.includes('/blood-requests') && path.includes('/cancel')) return 'blood_request_cancel';
  
  // Donation actions
  if (path.includes('/donations') && method === 'POST') return 'donation_schedule';
  if (path.includes('/donations') && path.includes('/start')) return 'donation_start';
  if (path.includes('/donations') && path.includes('/complete')) return 'donation_complete';
  if (path.includes('/donations') && path.includes('/cancel')) return 'donation_cancel';
  if (path.includes('/donations') && path.includes('/test')) return 'donation_test';
  if (path.includes('/donations') && path.includes('/store')) return 'donation_store';
  if (path.includes('/donations') && path.includes('/distribute')) return 'donation_distribute';
  
  // Notification actions
  if (path.includes('/notifications') && method === 'POST') return 'notification_send';
  if (path.includes('/notifications') && method === 'GET') return 'notification_read';
  if (path.includes('/notifications') && method === 'DELETE') return 'notification_delete';
  
  // Admin actions
  if (path.includes('/admin') && method === 'POST') return 'admin_action';
  if (path.includes('/admin') && method === 'PUT') return 'admin_update';
  if (path.includes('/admin') && method === 'DELETE') return 'admin_delete';
  
  // Export actions
  if (path.includes('/export')) return 'data_export';
  
  // Default action based on HTTP method
  const methodActions = {
    'GET': 'blood_request_view', // Use a valid enum value
    'POST': 'blood_request_create', // Use a valid enum value
    'PUT': 'blood_request_update', // Use a valid enum value
    'PATCH': 'blood_request_update', // Use a valid enum value
    'DELETE': 'blood_request_delete' // Use a valid enum value
  };
  
  return methodActions[method] || 'blood_request_view';
};

const determineResource = (path, params) => {
  const pathSegments = path.split('/').filter(segment => segment);
  
  if (path.includes('/users')) {
    return {
      resourceType: 'user',
      resourceId: params.userId || params.id
    };
  }
  
  if (path.includes('/blood-requests')) {
    return {
      resourceType: 'blood_request',
      resourceId: params.requestId || params.id
    };
  }
  
  if (path.includes('/donations')) {
    return {
      resourceType: 'donation',
      resourceId: params.donationId || params.id
    };
  }
  
  if (path.includes('/notifications')) {
    return {
      resourceType: 'notification',
      resourceId: params.notificationId || params.id
    };
  }
  
  if (path.includes('/admin')) {
    return {
      resourceType: 'system',
      resourceId: null
    };
  }
  
  return {
    resourceType: 'system',
    resourceId: null
  };
};

const generateDescription = (req, res, responseBody) => {
  const method = req.method;
  const path = req.path;
  const statusCode = res.statusCode;
  
  let description = `${method} ${path}`;
  
  if (statusCode >= 400) {
    description += ` - Failed with status ${statusCode}`;
    if (responseBody?.error) {
      description += `: ${responseBody.error}`;
    }
  } else {
    description += ` - Success`;
  }
  
  return description;
};

const extractChanges = (req, responseBody) => {
  // Only extract changes for PUT/PATCH requests
  if (!['PUT', 'PATCH'].includes(req.method)) {
    return null;
  }
  
  try {
    return {
      before: req.body, // This would need to be populated with original data
      after: responseBody?.data || responseBody
    };
  } catch (error) {
    return null;
  }
};

const determineRiskLevel = (req, res, responseBody) => {
  // High risk actions
  const highRiskActions = [
    'user_delete',
    'blood_request_delete',
    'donation_cancel',
    'admin_delete',
    'data_export'
  ];
  
  const action = determineAction(req.method, req.path);
  if (highRiskActions.includes(action)) {
    return 'high';
  }
  
  // Failed authentication attempts
  if (req.path.includes('/auth') && res.statusCode >= 400) {
    return 'medium';
  }
  
  // Admin actions
  if (req.path.includes('/admin')) {
    return 'medium';
  }
  
  // Default to low risk
  return 'low';
};

const getLocationFromIP = async (ipAddress) => {
  // In a real implementation, you would use a geolocation service
  // For now, return a default location
  return {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown'
  };
};

module.exports = auditLogger;
