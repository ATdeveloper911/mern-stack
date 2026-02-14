import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { fetchNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../utils/notifications'
import { useAuth } from '../context/AuthContext'

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
 * Custom hook for managing notifications
 * @param {Object} options - Query options
 * @returns {Object} Notifications data and functions
 */
export function useNotifications(options = {}) {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile?.id || user?.id
  const userRole = profile?.role

  // Get allowed notification types for this user
  const allowedTypes = getAllowedNotificationTypes(userRole)

  // Fetch notifications with role-based filtering
  const {
    data: allNotifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications', userId, options],
    queryFn: () => fetchNotifications(options),
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  })

  // Filter notifications by allowed types
  // For admin: only show pending internship approvals
  // For software_house: only show approved/rejected internship approvals (not pending)
  const notifications = useMemo(() => {
    if (!allNotifications || allowedTypes.length === 0) return []
    return allNotifications.filter(n => {
      if (!allowedTypes.includes(n.type)) return false
      // For admin: only show pending internship approvals
      if (userRole === 'admin' && n.type === 'internship_approval') {
        return n.metadata?.status === 'pending'
      }
      // For software_house: only show approved/rejected internship approvals (exclude pending)
      if (userRole === 'software_house' && n.type === 'internship_approval') {
        return n.metadata?.status === 'approved' || n.metadata?.status === 'rejected'
      }
      return true
    })
  }, [allNotifications, allowedTypes, userRole])

  // Fetch unread count (filtered by role)
  const {
    data: unreadCount = 0,
    refetch: refetchCount
  } = useQuery({
    queryKey: ['unreadNotificationCount', userId, userRole],
    queryFn: () => getUnreadCount(userRole),
    enabled: !!userId && !!userRole,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Real-time subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Invalidate queries to refetch
          queryClient.invalidateQueries(['notifications', userId])
          queryClient.invalidateQueries(['unreadNotificationCount', userId])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  // Mark notification as read (only for allowed types)
  const markNotificationAsRead = async (notificationId) => {
    try {
      // Verify notification is allowed for this user
      const notification = allNotifications.find(n => n.id === notificationId)
      if (!notification || !allowedTypes.includes(notification.type)) {
        throw new Error('Notification not accessible')
      }
      
      await markAsRead(notificationId)
      // Optimistically update
      queryClient.setQueryData(['notifications', userId, options], (old) => {
        if (!old) return old
        return old.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      })
      // Refetch count
      refetchCount()
    } catch (error) {
      console.error('[useNotifications] Error marking as read:', error)
      throw error
    }
  }

  // Mark all as read (only for allowed types)
  const markAllNotificationsAsRead = async () => {
    try {
      // Only mark allowed notifications as read
      const allowedNotificationIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id)
      
      if (allowedNotificationIds.length === 0) return
      
      // Mark each allowed notification as read
      await Promise.all(allowedNotificationIds.map(id => markAsRead(id)))
      
      // Optimistically update
      queryClient.setQueryData(['notifications', userId, options], (old) => {
        if (!old) return old
        return old.map(n => 
          allowedTypes.includes(n.type) && !n.is_read 
            ? { ...n, is_read: true } 
            : n
        )
      })
      // Refetch count
      refetchCount()
    } catch (error) {
      console.error('[useNotifications] Error marking all as read:', error)
      throw error
    }
  }

  // Delete a single notification
  const deleteSingleNotification = async (notificationId) => {
    try {
      // Verify notification is allowed for this user
      const notification = allNotifications.find(n => n.id === notificationId)
      if (!notification || !allowedTypes.includes(notification.type)) {
        throw new Error('Notification not accessible')
      }
      
      await deleteNotification(notificationId)
      // Optimistically update
      queryClient.setQueryData(['notifications', userId, options], (old) => {
        if (!old) return old
        return old.filter(n => n.id !== notificationId)
      })
      // Refetch count
      refetchCount()
    } catch (error) {
      console.error('[useNotifications] Error deleting notification:', error)
      throw error
    }
  }

  // Delete all notifications (only for allowed types)
  const deleteAllUserNotifications = async () => {
    try {
      // Only delete allowed notifications
      const allowedNotificationIds = notifications.map(n => n.id)
      
      if (allowedNotificationIds.length === 0) return
      
      // Delete each allowed notification
      await Promise.all(allowedNotificationIds.map(id => deleteNotification(id)))
      
      // Optimistically update
      queryClient.setQueryData(['notifications', userId, options], (old) => {
        if (!old) return old
        return old.filter(n => !allowedTypes.includes(n.type))
      })
      // Refetch count
      refetchCount()
    } catch (error) {
      console.error('[useNotifications] Error deleting all notifications:', error)
      throw error
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: deleteSingleNotification,
    deleteAllNotifications: deleteAllUserNotifications,
  }
}

