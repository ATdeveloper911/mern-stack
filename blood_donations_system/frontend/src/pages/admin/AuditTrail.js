import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaShieldAlt, 
  FaSearch, 
  FaFilter, 
  FaDownload, 
  FaEye, 
  FaUser, 
  FaCalendarAlt, 
  FaClock, 
  FaMapMarkerAlt, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaInfoCircle, 
  FaTimesCircle,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTrash,
  FaEdit,
  FaPlus,
  FaHeart,
  FaHandHoldingHeart,
  FaUserMd,
  FaUserShield,
  FaDatabase,
  FaBell,
  FaGlobe,
  FaCloud,
  FaKey,
  FaLock,
  FaUnlock
} from 'react-icons/fa';
import { useQuery } from 'react-query';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';

const AuditTrail = () => {
  const { user, hasRole } = useAuth();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  // Fetch audit logs
  const { data: auditData, isLoading: auditLoading } = useQuery(
    ['audit-trail', { 
      searchTerm, 
      actionFilter, 
      userFilter, 
      entityFilter, 
      dateFrom, 
      dateTo, 
      sortBy, 
      sortOrder, 
      page: currentPage 
    }],
    async () => {
      const response = await adminAPI.getAuditTrail({
        search: searchTerm || undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        userRole: userFilter !== 'all' ? userFilter : undefined,
        resourceType: entityFilter !== 'all' ? entityFilter.toLowerCase().replace(/\s+/g, '_') : undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 20
      });
      // Axios returns response object, extract the data property
      return response.data;
    },
    {
      enabled: hasRole(['system_admin']),
      onError: (error) => {
        console.error('Audit trail query error:', error);
      }
    }
  );

  const auditLogs = auditData?.data?.auditTrails || [];
  const pagination = auditData?.data?.pagination || {};

  // Get action icon
  const getActionIcon = (action) => {
    const actionUpper = action?.toUpperCase() || '';
    if (actionUpper.includes('LOGIN')) return FaKey;
    if (actionUpper.includes('LOGOUT')) return FaLock;
    if (actionUpper.includes('CREATE')) return FaPlus;
    if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT')) return FaEdit;
    if (actionUpper.includes('DELETE')) return FaTrash;
    if (actionUpper.includes('VIEW') || actionUpper.includes('READ')) return FaEye;
    if (actionUpper.includes('DONATION')) return FaHeart;
    if (actionUpper.includes('REQUEST')) return FaHandHoldingHeart;
    if (actionUpper.includes('USER')) return FaUser;
    if (actionUpper.includes('ADMIN')) return FaUserShield;
    if (actionUpper.includes('MEDICAL')) return FaUserMd;
    if (actionUpper.includes('DATABASE')) return FaDatabase;
    if (actionUpper.includes('NOTIFICATION')) return FaBell;
    if (actionUpper.includes('API')) return FaGlobe;
    if (actionUpper.includes('BACKUP')) return FaCloud;
    if (actionUpper.includes('SECURITY') || actionUpper.includes('SUSPICIOUS')) return FaExclamationTriangle;
    if (actionUpper.includes('PASSWORD')) return FaLock;
    if (actionUpper.includes('SETTINGS')) return FaKey;
    return FaInfoCircle;
  };

  // Get action color
  const getActionColor = (action) => {
    const actionUpper = action?.toUpperCase() || '';
    if (actionUpper.includes('LOGIN') || actionUpper.includes('CREATE')) return 'text-green-600';
    if (actionUpper.includes('LOGOUT') || actionUpper.includes('DELETE')) return 'text-red-600';
    if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT')) return 'text-blue-600';
    if (actionUpper.includes('VIEW') || actionUpper.includes('READ')) return 'text-gray-600';
    if (actionUpper.includes('ERROR') || actionUpper.includes('FAIL')) return 'text-red-600';
    if (actionUpper.includes('SUCCESS') || actionUpper.includes('COMPLETE')) return 'text-green-600';
    if (actionUpper.includes('SECURITY') || actionUpper.includes('SUSPICIOUS')) return 'text-red-600';
    return 'text-gray-600';
  };

  // Get risk level color
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get entity icon
  const getEntityIcon = (entityType) => {
    if (!entityType) return FaInfoCircle;
    const type = entityType.toLowerCase();
    switch (type) {
      case 'user':
        return FaUser;
      case 'blood_request':
      case 'bloodrequest':
        return FaHandHoldingHeart;
      case 'donation':
        return FaHeart;
      case 'notification':
        return FaBell;
      case 'audit_trail':
      case 'audittrail':
      case 'system':
        return FaShieldAlt;
      case 'authentication':
      case 'auth':
        return FaKey;
      case 'medical_record':
        return FaUserMd;
      default:
        return FaInfoCircle;
    }
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortBy !== field) return FaSort;
    return sortOrder === 'asc' ? FaSortUp : FaSortDown;
  };

  // Handle view log
  const handleViewLog = (log) => {
    setSelectedLog(log);
    setShowLogModal(true);
  };

  // Handle export
  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting audit trail...');
  };

  if (auditLoading) {
    return <LoadingSpinner fullScreen text="Loading audit trail..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Audit Trail</h1>
          <p className="text-neutral-600 mt-1">
            Monitor and track all system activities and user actions
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button 
            onClick={handleExport}
            className="btn btn-outline flex items-center space-x-2"
          >
            <FaDownload />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Search
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="register">Register</option>
              <option value="user_create">User Create</option>
              <option value="user_update">User Update</option>
              <option value="user_delete">User Delete</option>
              <option value="profile_update">Profile Update</option>
              <option value="profile_view">Profile View</option>
              <option value="blood_request_create">Blood Request Create</option>
              <option value="blood_request_update">Blood Request Update</option>
              <option value="blood_request_delete">Blood Request Delete</option>
              <option value="donation_schedule">Donation Schedule</option>
              <option value="donation_complete">Donation Complete</option>
              <option value="notification_send">Notification Send</option>
              <option value="system_config_update">System Config Update</option>
              <option value="security_alert">Security Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="system_admin">System Admin</option>
              <option value="medical_admin">Medical Admin</option>
              <option value="donor">Donor</option>
              <option value="recipient">Recipient</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Entity
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            >
              <option value="all">All Entities</option>
              <option value="User">User</option>
              <option value="BloodRequest">Blood Request</option>
              <option value="Donation">Donation</option>
              <option value="Notification">Notification</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center">
                      <FaShieldAlt className="h-12 w-12 text-neutral-300 mb-4" />
                      <p className="text-lg font-medium">No audit logs found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  const EntityIcon = getEntityIcon(log.resourceType || log.entityType);
                
                return (
                  <motion.tr
                    key={log._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-neutral-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ActionIcon className={`h-5 w-5 mr-3 ${getActionColor(log.action)}`} />
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {log.action}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {log.resourceType || log.entityType || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blood-100 flex items-center justify-center">
                            <FaUser className="h-4 w-4 text-blood-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-neutral-900">
                            {log.userId?.firstName && log.userId?.lastName 
                              ? `${log.userId.firstName} ${log.userId.lastName}` 
                              : log.userEmail || 'System'}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {log.userId?.email || log.userEmail || 'system@bloodlink.com'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <EntityIcon className="h-4 w-4 mr-2 text-neutral-400" />
                        <span className="text-sm text-neutral-900">
                          {log.resourceType || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      <div className="flex items-center">
                        <FaClock className="h-4 w-4 mr-1" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRiskLevelColor(log.riskLevel || 'low')}>
                        {log.riskLevel || 'low'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewLog(log)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </motion.tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(pagination.totalPages || pagination.pages || (pagination.total && pagination.limit ? Math.ceil(pagination.total / pagination.limit) : 1)) > 1 && (
          <div className="px-6 py-4 border-t border-neutral-200">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages || pagination.pages || (pagination.total && pagination.limit ? Math.ceil(pagination.total / pagination.limit) : 1)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* View Log Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Audit Log Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Action</label>
                <p className="text-neutral-900">{selectedLog.action}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Entity Type</label>
                <p className="text-neutral-900">{selectedLog.resourceType || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">User</label>
                <p className="text-neutral-900">
                  {selectedLog.userId?.firstName && selectedLog.userId?.lastName 
                    ? `${selectedLog.userId.firstName} ${selectedLog.userId.lastName}` 
                    : selectedLog.userEmail || 'System'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Email</label>
                <p className="text-neutral-900">
                  {selectedLog.userId?.email || selectedLog.userEmail || 'system@bloodlink.com'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">IP Address</label>
                <p className="text-neutral-900">{selectedLog.ipAddress || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Timestamp</label>
                <p className="text-neutral-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {selectedLog.details && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Details</label>
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <pre className="text-sm text-neutral-900 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {selectedLog.riskLevel && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Risk Level</label>
                <Badge className={getRiskLevelColor(selectedLog.riskLevel)}>
                  {selectedLog.riskLevel}
                </Badge>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditTrail;
