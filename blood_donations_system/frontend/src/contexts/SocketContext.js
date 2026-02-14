import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { notificationAPI } from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const { isAuthenticated, user, token } = useAuth();

  // Initialize unread count from API (fallback when no socket event yet)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        if (isAuthenticated) {
          const res = await notificationAPI.getNotifications({ page: 1, limit: 5 });
          const unread = res?.data?.data?.unreadCount ?? res?.data?.unreadCount ?? 0;
          const list = res?.data?.data?.notifications ?? [];
          setUnreadCount(unread);
          if (Array.isArray(list) && list.length > 0) {
            setNotifications(list);
          }
        } else {
          setUnreadCount(0);
          setNotifications([]);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchUnread();
  }, [isAuthenticated]);

  // Poll notifications periodically to update navbar list and count
  useEffect(() => {
    let intervalId;
    const poll = async () => {
      try {
        if (isAuthenticated) {
          const res = await notificationAPI.getNotifications({ page: 1, limit: 5 });
          const unread = res?.data?.data?.unreadCount ?? 0;
          const list = res?.data?.data?.notifications ?? [];
          setUnreadCount(unread);
          if (Array.isArray(list)) setNotifications(list);
        }
      } catch (_) {}
    };
    if (isAuthenticated) {
      intervalId = setInterval(poll, 20000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && token && !socket && connectionAttempts < 3) {
      // Initialize socket connection
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
      console.log('Connecting to socket:', socketUrl, 'Attempt:', connectionAttempts + 1);
      
      setConnectionAttempts(prev => prev + 1);
      
      const newSocket = io(socketUrl, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        
        // Join user's personal room
        newSocket.emit('join-user-room', user?._id);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Listen for new notifications
      newSocket.on('new-notification', (notification) => {
        console.log('New notification received:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        if (notification.priority === 'critical' || notification.isUrgent) {
          toast.error(notification.message, {
            duration: 6000,
            style: {
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
            },
          });
        } else if (notification.priority === 'high') {
          toast(notification.message, {
            duration: 4000,
            style: {
              background: '#fef3c7',
              color: '#d97706',
              border: '1px solid #fde68a',
            },
          });
        } else {
          toast.success(notification.message, {
            duration: 3000,
          });
        }
      });

      // Listen for blood request updates
      newSocket.on('blood-request-update', (data) => {
        console.log('Blood request update:', data);
        toast.success(`Blood request updated: ${data.message}`, {
          duration: 4000,
        });
      });

      // Listen for donation updates
      newSocket.on('donation-update', (data) => {
        console.log('Donation update:', data);
        toast.success(`Donation update: ${data.message}`, {
          duration: 4000,
        });
      });

      // Listen for emergency alerts
      newSocket.on('emergency-alert', (data) => {
        console.log('Emergency alert:', data);
        toast.error(`🚨 EMERGENCY: ${data.message}`, {
          duration: 8000,
          style: {
            background: '#fef2f2',
            color: '#dc2626',
            border: '2px solid #ef4444',
            fontSize: '16px',
            fontWeight: 'bold',
          },
        });
      });

      // Listen for system announcements
      newSocket.on('system-announcement', (data) => {
        console.log('System announcement:', data);
        toast(data.message, {
          duration: 5000,
          style: {
            background: '#f0f9ff',
            color: '#0369a1',
            border: '1px solid #7dd3fc',
          },
        });
      });

      // Listen for user status updates
      newSocket.on('user-status-update', (data) => {
        console.log('User status update:', data);
        if (data.userId === user.id) {
          toast.success(`Status updated: ${data.message}`, {
            duration: 3000,
          });
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, token, user?._id, socket, connectionAttempts]);

  // Reset connection attempts when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setConnectionAttempts(0);
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  // Join a specific room (e.g., blood request room)
  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('join-request-room', roomId);
    }
  };

  // Leave a specific room
  const leaveRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leave-request-room', roomId);
    }
  };

  // Send a message to a specific room
  const sendMessage = (roomId, message) => {
    if (socket && isConnected) {
      socket.emit('send-message', { roomId, message });
    }
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId) => {
    if (socket && isConnected) {
      socket.emit('mark-notification-read', notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = () => {
    if (socket && isConnected) {
      socket.emit('mark-all-notifications-read');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    }
  };

  // Get real-time updates for blood requests
  const subscribeToBloodRequest = (requestId) => {
    if (socket && isConnected) {
      socket.emit('subscribe-blood-request', requestId);
    }
  };

  // Unsubscribe from blood request updates
  const unsubscribeFromBloodRequest = (requestId) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe-blood-request', requestId);
    }
  };

  // Get real-time updates for donations
  const subscribeToDonation = (donationId) => {
    if (socket && isConnected) {
      socket.emit('subscribe-donation', donationId);
    }
  };

  // Unsubscribe from donation updates
  const unsubscribeFromDonation = (donationId) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe-donation', donationId);
    }
  };

  // Send typing indicator
  const sendTypingIndicator = (roomId, isTyping) => {
    if (socket && isConnected) {
      socket.emit('typing', { roomId, isTyping });
    }
  };

  // Listen for typing indicators
  const onTyping = (callback) => {
    if (socket) {
      socket.on('typing', callback);
      return () => socket.off('typing', callback);
    }
  };

  // Listen for new messages
  const onMessage = (callback) => {
    if (socket) {
      socket.on('new-message', callback);
      return () => socket.off('new-message', callback);
    }
  };

  // Listen for user online status
  const onUserStatus = (callback) => {
    if (socket) {
      socket.on('user-status', callback);
      return () => socket.off('user-status', callback);
    }
  };

  // Get connection status
  const getConnectionStatus = () => {
    return {
      isConnected,
      socketId: socket?.id,
      transport: socket?.io?.engine?.transport?.name,
    };
  };

  const value = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    joinRoom,
    leaveRoom,
    sendMessage,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    subscribeToBloodRequest,
    unsubscribeFromBloodRequest,
    subscribeToDonation,
    unsubscribeFromDonation,
    sendTypingIndicator,
    onTyping,
    onMessage,
    onUserStatus,
    getConnectionStatus,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
