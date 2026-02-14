import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationAPI } from '../../services/api';
import { FaBell, FaCheckCircle, FaTrash, FaEnvelopeOpenText, FaEnvelope, FaFilter, FaSearch } from 'react-icons/fa';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all'); // all | unread | read
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const params = useMemo(() => ({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    type: type === 'all' ? undefined : type,
    page,
    limit,
  }), [search, status, type, page, limit]);

  const { data, isLoading, error } = useQuery([
    'notifications', params
  ], () => notificationAPI.getNotifications({
    // Backend supports: type, priority, isRead, isUrgent, startDate, endDate, page, limit
    type: params.type,
    isRead: status === 'all' ? undefined : (status === 'read' ? 'true' : 'false'),
    page: params.page,
    limit: params.limit
  }), { 
    keepPreviousData: true,
    onSuccess: (response) => {
      console.log('Notifications API Response:', response);
      console.log('Response.data:', response?.data);
      console.log('Response.data.data:', response?.data?.data);
    },
    onError: (err) => {
      console.error('Notifications API Error:', err);
      console.error('Error response:', err?.response);
    }
  });

  // Backend returns: { success: true, data: { notifications: [...], unreadCount: ..., pagination: {...} } }
  // Axios wraps it: response.data = { success: true, data: {...} }
  // So: data.data = { notifications: [...], unreadCount: ..., pagination: {...} }
  const responseData = data?.data?.data || data?.data || {};
  const notifications = Array.isArray(responseData.notifications) ? responseData.notifications : [];
  const paginationRaw = responseData.pagination || {};
  const pagination = {
    currentPage: paginationRaw.current || paginationRaw.currentPage || 1,
    totalPages: paginationRaw.pages || paginationRaw.totalPages || 1,
    total: paginationRaw.total || 0,
    limit: paginationRaw.limit || 10
  };
  
  console.log('=== NOTIFICATIONS DEBUG ===');
  console.log('Full API response:', data);
  console.log('Response data:', data?.data);
  console.log('Response data.data:', data?.data?.data);
  console.log('Extracted notifications count:', notifications.length);
  console.log('First notification:', notifications[0]);
  console.log('Pagination:', pagination);
  console.log('===========================');

  const markAsRead = useMutation((id) => notificationAPI.markAsRead(id), {
    onSuccess: () => queryClient.invalidateQueries('notifications')
  });
  const markAsUnread = useMutation((id) => notificationAPI.markAsUnread(id), {
    onSuccess: () => queryClient.invalidateQueries('notifications')
  });
  const deleteNotif = useMutation((id) => notificationAPI.deleteNotification(id), {
    onSuccess: () => queryClient.invalidateQueries('notifications')
  });
  const markAllAsRead = useMutation(() => notificationAPI.markAllAsRead(), {
    onSuccess: () => queryClient.invalidateQueries('notifications')
  });

  if (isLoading) return <LoadingSpinner fullScreen text="Loading notifications..." />;
  if (error) return <div className="text-red-600 p-6">Failed to load notifications.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FaBell className="text-yellow-600 mr-2" />
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => markAllAsRead.mutate()} className="flex items-center gap-2">
            <FaCheckCircle />
            <span>Mark all as read</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg"
            />
          </div>
          <select value={status} onChange={(e)=>{ setStatus(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select value={type} onChange={(e)=>{ setType(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg">
            <option value="all">All types</option>
            <option value="blood_request">Blood Request</option>
            <option value="appointment">Donation Scheduled</option>
            <option value="donation_completed">Donation Completed</option>
            <option value="medical_update">Medical Update</option>
            <option value="verification">Verification</option>
            <option value="reminder">Reminder</option>
            <option value="system_announcement">System Announcement</option>
            <option value="security_alert">Security Alert</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">No notifications found.</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {notifications.map((n) => (
              <li key={n._id} className={`p-4 flex items-start justify-between ${n.isRead ? 'bg-white' : 'bg-yellow-50'}`}>
                <div>
                  <div className="text-sm text-neutral-500">{new Date(n.createdAt).toLocaleString()}</div>
                  <div className="font-medium text-neutral-900">{n.title || 'Notification'}</div>
                  <div className="text-neutral-700">{n.message}</div>
                  {n.metadata && (
                    <div className="text-xs text-neutral-500 mt-1">{Object.entries(n.metadata).map(([k,v])=>`${k}: ${v}`).join(' • ')}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {n.isRead ? (
                    <Button size="sm" variant="outline" onClick={()=>markAsUnread.mutate(n._id)} className="flex items-center gap-1"><FaEnvelope /> Unread</Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={()=>markAsRead.mutate(n._id)} className="flex items-center gap-1"><FaEnvelopeOpenText /> Read</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={()=>deleteNotif.mutate(n._id)} className="flex items-center gap-1 text-red-600 border-red-200"><FaTrash /> Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;


