/**
 * Helper function to format audit trail activities into user-friendly descriptions
 * @param {Object} activity - The audit trail activity object
 * @returns {Object} Formatted activity with user-friendly description
 */
const formatActivity = (activity) => {
  if (!activity || !activity.action) {
    return null;
  }

  const action = activity.action;
  
  // Handle both populated and unpopulated userId
  let userName = 'System';
  if (activity.userId) {
    if (typeof activity.userId === 'object' && activity.userId.firstName) {
      // Populated user object
      userName = activity.userId.firstName && activity.userId.lastName
        ? `${activity.userId.firstName} ${activity.userId.lastName}`
        : activity.userId.email || activity.userEmail || 'User';
    } else {
      // Just an ID, use email
      userName = activity.userEmail || 'User';
    }
  } else {
    userName = activity.userEmail || 'System';
  }
  
  const userRole = (typeof activity.userId === 'object' && activity.userId?.role) 
    ? activity.userId.role 
    : activity.userRole || 'user';
  const changes = activity.changes || {};
  const metadata = activity.metadata || {};

  let description = '';
  let type = 'system';
  let icon = '📋';

  // Authentication actions
  if (action === 'login') {
    description = `${userName} logged in`;
    type = 'authentication';
    icon = '🔐';
  } else if (action === 'logout') {
    description = `${userName} logged out`;
    type = 'authentication';
    icon = '🚪';
  } else if (action === 'register') {
    description = `${userName} created an account`;
    type = 'user';
    icon = '👤';
  } else if (action === 'password_reset') {
    description = `${userName} reset their password`;
    type = 'authentication';
    icon = '🔑';
  } else if (action === 'password_change') {
    description = `${userName} changed their password`;
    type = 'authentication';
    icon = '🔑';
  } else if (action === 'email_verification') {
    description = `${userName} verified their email`;
    type = 'authentication';
    icon = '✉️';
  }
  
  // User profile actions
  else if (action === 'profile_update') {
    const updatedFields = [];
    if (changes.after) {
      if (changes.after.firstName || changes.after.lastName) updatedFields.push('name');
      if (changes.after.phone) updatedFields.push('phone');
      if (changes.after.address) updatedFields.push('address');
      if (changes.after.medicalHistory) updatedFields.push('medical history');
      if (changes.after.settings) updatedFields.push('settings');
    }
    const fieldsText = updatedFields.length > 0 
      ? ` (${updatedFields.join(', ')})`
      : '';
    description = `${userName} updated their profile${fieldsText}`;
    type = 'profile';
    icon = '👤';
  } else if (action === 'profile_picture_update') {
    description = `${userName} updated their profile picture`;
    type = 'profile';
    icon = '📷';
  } else if (action === 'settings_update') {
    description = `${userName} updated system settings`;
    type = 'settings';
    icon = '⚙️';
  }
  
  // Blood request actions
  else if (action === 'blood_request_create') {
    const bloodType = metadata.bloodType || changes.after?.bloodType || '';
    description = `${userName} created a blood request${bloodType ? ` for ${bloodType}` : ''}`;
    type = 'request';
    icon = '🩸';
  } else if (action === 'blood_request_update') {
    // Check if status was updated
    if (changes.after?.status && changes.before?.status !== changes.after?.status) {
      const status = changes.after.status;
      description = `${userName} updated blood request status to ${status}`;
      type = 'request';
      icon = '🔄';
    } else {
      description = `${userName} updated a blood request`;
      type = 'request';
      icon = '📝';
    }
  } else if (action === 'blood_request_confirm') {
    description = `${userName} confirmed a donor for blood request`;
    type = 'request';
    icon = '✅';
  } else if (action === 'blood_request_complete') {
    description = `${userName} completed a blood request`;
    type = 'request';
    icon = '✅';
  } else if (action === 'blood_request_cancel') {
    description = `${userName} cancelled a blood request`;
    type = 'request';
    icon = '❌';
  } else if (action === 'blood_request_match') {
    description = `${userName} matched a donor to a blood request`;
    type = 'request';
    icon = '🎯';
  }
  
  // Donation actions
  else if (action === 'donation_schedule') {
    description = `${userName} scheduled a blood donation`;
    type = 'donation';
    icon = '📅';
  } else if (action === 'donation_start') {
    description = `${userName} started a blood donation`;
    type = 'donation';
    icon = '🩸';
  } else if (action === 'donation_complete') {
    description = `${userName} completed a blood donation`;
    type = 'donation';
    icon = '✅';
  } else if (action === 'donation_test') {
    description = `${userName} updated test results for a donation`;
    type = 'donation';
    icon = '🧪';
  } else if (action === 'donation_store') {
    description = `${userName} stored blood from a donation`;
    type = 'donation';
    icon = '📦';
  } else if (action === 'donation_distribute') {
    description = `${userName} distributed blood to a hospital`;
    type = 'donation';
    icon = '🚚';
  }
  
  // Admin actions
  else if (action === 'user_create') {
    const newUserRole = metadata.role || changes.after?.role || 'user';
    description = `${userName} created a new ${newUserRole} user`;
    type = 'admin';
    icon = '➕';
  } else if (action === 'user_update') {
    description = `${userName} updated a user`;
    type = 'admin';
    icon = '✏️';
  } else if (action === 'user_delete') {
    description = `${userName} deleted a user`;
    type = 'admin';
    icon = '🗑️';
  } else if (action === 'user_block') {
    description = `${userName} blocked a user`;
    type = 'admin';
    icon = '🚫';
  } else if (action === 'user_unblock') {
    description = `${userName} unblocked a user`;
    type = 'admin';
    icon = '✅';
  }
  
  // Medical actions
  else if (action === 'medical_verification') {
    const isVerified = changes.after?.isMedicalVerified !== false;
    description = `${userName} ${isVerified ? 'verified' : 'revoked verification for'} a user`;
    type = 'medical';
    icon = '🏥';
  } else if (action === 'health_check') {
    description = `${userName} performed a health check`;
    type = 'medical';
    icon = '🩺';
  } else if (action === 'test_result_update') {
    description = `${userName} updated test results`;
    type = 'medical';
    icon = '🧪';
  }
  
  // System actions
  else if (action === 'system_config_update') {
    description = `${userName} updated system configuration`;
    type = 'settings';
    icon = '⚙️';
  } else if (action === 'data_export') {
    description = `${userName} exported data`;
    type = 'system';
    icon = '📥';
  } else if (action === 'data_import') {
    description = `${userName} imported data`;
    type = 'system';
    icon = '📤';
  } else if (action === 'backup_create') {
    description = `${userName} created a backup`;
    type = 'system';
    icon = '💾';
  } else if (action === 'system_cleanup') {
    description = `${userName} performed system cleanup`;
    type = 'system';
    icon = '🧹';
  }
  
  // Default fallback
  else {
    // Try to create a readable description from the action
    const readableAction = action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    description = `${userName} performed: ${readableAction}`;
    type = 'system';
  }

  return {
    description,
    type,
    icon,
    createdAt: activity.createdAt,
    userEmail: activity.userEmail,
    riskLevel: activity.riskLevel,
    status: activity.status
  };
};

/**
 * Filter and format activities for a specific role
 * @param {Array} activities - Array of audit trail activities
 * @param {String} role - User role (donor, recipient, medical_admin, system_admin)
 * @param {String} userId - Optional user ID to filter own activities
 * @returns {Array} Filtered and formatted activities
 */
const formatActivitiesForRole = (activities, role, userId = null) => {
  if (!activities || !Array.isArray(activities)) {
    return [];
  }

  // Define relevant actions for each role
  const roleActions = {
    donor: [
      'login', 'logout', 'profile_update', 'profile_picture_update', 'password_change',
      'donation_schedule', 'donation_start', 'donation_complete', 'donation_cancel',
      'blood_request_view', 'notification_read'
    ],
    recipient: [
      'login', 'logout', 'profile_update', 'profile_picture_update', 'password_change',
      'blood_request_create', 'blood_request_update', 'blood_request_complete', 'blood_request_cancel',
      'blood_request_view', 'notification_read'
    ],
    medical_admin: [
      'login', 'logout', 'profile_update', 'settings_update', 'password_change',
      'blood_request_update', 'blood_request_confirm', 'blood_request_match', 'blood_request_complete',
      'donation_start', 'donation_complete', 'donation_test', 'donation_store', 'donation_distribute',
      'medical_verification', 'health_check', 'test_result_update',
      'user_create', 'user_update', 'user_view', 'notification_send'
    ],
    system_admin: [
      'login', 'logout', 'profile_update', 'settings_update', 'password_change',
      'user_create', 'user_update', 'user_delete', 'user_block', 'user_unblock',
      'blood_request_update', 'blood_request_view',
      'donation_view', 'donation_distribute',
      'system_config_update', 'data_export', 'data_import', 'backup_create',
      'medical_verification', 'notification_send'
    ]
  };

  // Get relevant actions for this role
  const relevantActions = roleActions[role] || [];

  // Filter activities
  let filtered = activities.filter(activity => {
    // Only show successful activities (or failed logins for security)
    if (activity.status === 'failure' && activity.action !== 'login') {
      return false;
    }

    // Filter by relevant actions
    if (relevantActions.length > 0 && !relevantActions.includes(activity.action)) {
      return false;
    }

    // For non-admin roles, only show their own activities
    if (role !== 'medical_admin' && role !== 'system_admin' && userId) {
      const activityUserId = activity.userId?._id?.toString() || activity.userId?.toString();
      if (activityUserId !== userId.toString()) {
        return false;
      }
    }

    return true;
  });

  // Format activities
  const formatted = filtered
    .map(activity => formatActivity(activity))
    .filter(activity => activity !== null);

  // Sort by date (most recent first) and limit to 10
  return formatted
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);
};

module.exports = {
  formatActivity,
  formatActivitiesForRole
};

