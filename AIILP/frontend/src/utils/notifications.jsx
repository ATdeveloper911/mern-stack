import React from 'react'
import { supabase } from './supabase'

/**
 * Fetch notifications for the current user
 * IMPORTANT: This function ensures complete data isolation - each user (admin, software_house, student, guest)
 * can ONLY see their own notifications, never notifications from other users.
 * 
 * @param {Object} options - Query options
 * @param {string} options.type - Filter by notification type
 * @param {boolean} options.isRead - Filter by read status
 * @param {number} options.limit - Limit number of results
 * @returns {Promise<Array>} Array of notifications (only for the current user)
 */
export async function fetchNotifications(options = {}) {
  const { type, isRead, limit = 100 } = options

  // Get current user to ensure we only fetch their notifications
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  // Explicitly filter by current user's ID - this ensures:
  // - Students/guests can ONLY see their own application status notifications
  // - Software houses can ONLY see notifications for their own internships/applications
  // - Admins can ONLY see admin-related notifications (user approvals, pending internships)
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id) // CRITICAL: Explicitly filter by current user's ID for complete isolation
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  if (isRead !== undefined) {
    query = query.eq('is_read', isRead)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Notifications] Error fetching notifications:', error)
    throw error
  }

  // Additional client-side verification: Double-check that ALL notifications belong to the current user
  // This is an extra security layer to ensure no notifications from other users slip through
  const verifiedNotifications = (data || []).filter(notification => {
    if (notification.user_id !== user.id) {
      console.warn('[Notifications] Security: Filtered out notification that does not belong to current user', {
        notificationId: notification.id,
        notificationUserId: notification.user_id,
        currentUserId: user.id
      })
      return false
    }
    return true
  })

  return verifiedNotifications
}

/**
 * Get allowed notification types based on user role
 * @param {string} role - User role
 * @returns {Array<string>} Allowed notification types
 */
function getAllowedNotificationTypes(role) {
  switch (role) {
    case 'admin':
      return ['user_approval', 'internship_approval']
    case 'software_house':
      return ['internship_approval', 'new_application']
    case 'student':
    case 'guest':
      return ['application_status']
    default:
      return []
  }
}

/**
 * Get unread notification count for the current user (filtered by role)
 * IMPORTANT: This function ensures complete data isolation - each user (admin, software_house, student, guest)
 * can ONLY count their own unread notifications, never notifications from other users.
 * 
 * @param {string} role - User role to filter by
 * @returns {Promise<number>} Unread count (only for the current user's notifications)
 */
export async function getUnreadCount(role = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  // Get user role if not provided
  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role
  }

  if (!role) return 0

  // Try using the database function first
  const { data, error } = await supabase.rpc('get_unread_notification_count_by_role', {
    user_uuid: user.id,
    user_role: role
  })

  if (!error && data !== null) {
    return data || 0
  }

  // Fallback to client-side filtering
  const allowedTypes = getAllowedNotificationTypes(role)
  if (allowedTypes.length === 0) return 0

  // Explicitly filter by current user's ID to ensure complete isolation:
  // - Students/guests can ONLY count their own application status notifications
  // - Software houses can ONLY count notifications for their own internships/applications
  // - Admins can ONLY count admin-related notifications
  const { data: notificationsData, error: fetchError } = await supabase
    .from('notifications')
    .select('id, type, metadata, is_read, user_id')
    .eq('user_id', user.id) // CRITICAL: Explicitly filter by current user's ID
    .eq('is_read', false)
    .in('type', allowedTypes)

  if (fetchError) {
    console.error('[Notifications] Error getting unread count:', fetchError)
    return 0
  }

  if (!notificationsData) return 0

  // Additional client-side verification: Double-check that ALL notifications belong to the current user
  // This ensures students/guests can ONLY count their own notifications
  const verifiedNotifications = notificationsData.filter(n => {
    // Security check: Filter out any notifications that don't belong to current user
    if (n.user_id !== user.id) {
      console.warn('[Notifications] Security: Filtered out notification in count that does not belong to current user', {
        notificationId: n.id,
        notificationUserId: n.user_id,
        currentUserId: user.id,
        role
      })
      return false
    }
    return true
  })

  // Filter notifications based on role-specific rules
  const filtered = verifiedNotifications.filter(n => {
    // For admin: only count pending internship approvals
    if (role === 'admin' && n.type === 'internship_approval') {
      return n.metadata?.status === 'pending'
    }
    // For software_house: only count approved/rejected internship approvals (exclude pending)
    if (role === 'software_house' && n.type === 'internship_approval') {
      return n.metadata?.status === 'approved' || n.metadata?.status === 'rejected'
    }
    // For students/guests: only count their own application_status notifications
    // (already filtered by user_id above, this is just for type verification)
    if ((role === 'student' || role === 'guest') && n.type === 'application_status') {
      return true // All application_status notifications for this user are valid
    }
    // All other notifications pass through
    return true
  })

  return filtered.length || 0
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export async function markAsRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('[Notifications] Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read for the current user
 * @returns {Promise<void>}
 */
export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('[Notifications] Error marking all as read:', error)
    throw error
  }
}

/**
 * Delete a single notification for the current user
 * @param {string} notificationId - Notification ID to delete
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Verify the notification belongs to the current user
  const { data: notification, error: fetchError } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('id', notificationId)
    .single()

  if (fetchError) {
    console.error('[Notifications] Error fetching notification:', fetchError)
    throw fetchError
  }

  if (!notification || notification.user_id !== user.id) {
    throw new Error('Notification not found or access denied')
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[Notifications] Error deleting notification:', error)
    throw error
  }
}

/**
 * Delete all notifications for the current user
 * @returns {Promise<void>}
 */
export async function deleteAllNotifications() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    console.error('[Notifications] Error deleting all notifications:', error)
    throw error
  }
}

/**
 * Format notification message based on type
 * @param {Object} notification - Notification object
 * @returns {string} Formatted message
 */
export function formatNotificationMessage(notification) {
  if (notification.message) {
    return notification.message
  }

  // Fallback formatting based on type
  switch (notification.type) {
    case 'user_approval':
      return notification.metadata?.status === 'approved'
        ? 'Your account has been approved.'
        : 'Your account has been rejected.'
    case 'internship_approval':
      return notification.metadata?.status === 'approved'
        ? 'Your internship has been approved.'
        : 'Your internship has been rejected.'
    case 'application_status':
      return notification.metadata?.status === 'accepted'
        ? 'Your application has been accepted.'
        : 'Your application has been rejected.'
    case 'new_application':
      return 'You have received a new application.'
    default:
      return notification.title || 'New notification'
  }
}

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
 * @returns {JSX.Element} Icon component
 */
export function getNotificationIcon(type) {
  const iconClass = "w-5 h-5"
  
  switch (type) {
    case 'user_approval':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'internship_approval':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'application_status':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    case 'new_application':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
  }
}

/**
 * Format relative time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted relative time
 */
export function formatRelativeTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now - d
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

