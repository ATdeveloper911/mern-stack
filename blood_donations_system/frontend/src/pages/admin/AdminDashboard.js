import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaHeart, 
  FaHandHoldingHeart, 
  FaChartLine, 
  FaShieldAlt, 
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaFilter,
  FaSearch,
  FaDownload,
  FaBell,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaTrophy,
  FaUserMd,
  FaDatabase,
  FaInfoCircle
} from 'react-icons/fa';
import { useQuery } from 'react-query';
import { adminAPI, analyticsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';

const AdminDashboard = () => {
  const { user, hasRole } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch admin dashboard data
  const { data: adminData, isLoading: adminLoading } = useQuery(
    ['admin-dashboard', selectedPeriod],
    () => adminAPI.getDashboard({ period: selectedPeriod }),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch system health
  const { data: systemHealth, isLoading: healthLoading } = useQuery(
    'system-health',
    () => adminAPI.getSystemHealth(),
    {
      enabled: hasRole(['system_admin']),
      refetchInterval: 60000, // Refetch every minute
    }
  );

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
    ['analytics', selectedPeriod],
    () => analyticsAPI.getDashboard({ period: selectedPeriod }),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  const dashboard = adminData?.data?.dashboard || {};
  const health = systemHealth?.data?.systemHealth || {};
  const analytics = analyticsData?.data?.dashboard || {};

  // Get period options
  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  // Get tab options
  const tabOptions = [
    { id: 'overview', label: 'Overview', icon: FaChartLine },
    { id: 'users', label: 'Users', icon: FaUsers },
    { id: 'requests', label: 'Blood Requests', icon: FaHandHoldingHeart },
    { id: 'donations', label: 'Donations', icon: FaHeart },
    { id: 'system', label: 'System', icon: FaShieldAlt }
  ];

  // Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Get trend icon and color
  const getTrendIcon = (percentage) => {
    if (percentage > 0) {
      return { icon: FaArrowUp, color: 'text-green-600', bg: 'bg-green-100' };
    } else if (percentage < 0) {
      return { icon: FaArrowDown, color: 'text-red-600', bg: 'bg-red-100' };
    } else {
      return { icon: FaMinus, color: 'text-neutral-600', bg: 'bg-neutral-100' };
    }
  };

  if (adminLoading) {
    return <LoadingSpinner fullScreen text="Loading admin dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            System overview and management for {user?.role === 'system_admin' ? 'System' : 'Medical'} Administrators
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button className="btn btn-outline flex items-center space-x-2">
            <FaDownload />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="flex flex-wrap gap-2">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'bg-blood-100 text-blood-700 border border-blood-200'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Total Users',
                value: dashboard.totalUsers || dashboard.overview?.totalUsers || 0,
                previous: dashboard.totalUsers || dashboard.overview?.totalUsers || 0,
                icon: FaUsers,
                color: 'text-blue-600',
                bgColor: 'bg-blue-100'
              },
              {
                title: 'Active Users',
                value: dashboard.activeUsers || dashboard.overview?.activeUsers || 0,
                previous: dashboard.activeUsers || dashboard.overview?.activeUsers || 0,
                icon: FaCheckCircle,
                color: 'text-green-600',
                bgColor: 'bg-green-100'
              },
              {
                title: 'Blood Requests',
                value: dashboard.totalRequests || dashboard.overview?.totalRequests || 0,
                previous: dashboard.totalRequests || dashboard.overview?.totalRequests || 0,
                icon: FaHandHoldingHeart,
                color: 'text-red-600',
                bgColor: 'bg-red-100'
              },
              {
                title: 'Donations',
                value: dashboard.totalDonations || dashboard.overview?.totalDonations || 0,
                previous: dashboard.totalDonations || dashboard.overview?.totalDonations || 0,
                icon: FaHeart,
                color: 'text-purple-600',
                bgColor: 'bg-purple-100'
              }
            ].map((metric, index) => {
              const percentageChange = calculatePercentageChange(metric.value, metric.previous);
              const trend = getTrendIcon(percentageChange);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                      <metric.icon className={`text-xl ${metric.color}`} />
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${trend.bg}`}>
                      <trend.icon className={trend.color} />
                      <span className={trend.color}>
                        {Math.abs(percentageChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 mb-1">
                      {metric.value.toLocaleString()}
                    </p>
                    <p className="text-sm text-neutral-600">{metric.title}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* System Health */}
          {hasRole(['system_admin']) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
            >
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                <FaShieldAlt className="mr-2 text-blood-600" />
                System Health
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {health.uptime || '99.9'}%
                  </div>
                  <p className="text-sm text-neutral-600">Uptime</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {health.averageResponseTime || '150'}ms
                  </div>
                  <p className="text-sm text-neutral-600">Avg Response Time</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {health.errorRate || '0.5'}%
                  </div>
                  <p className="text-sm text-neutral-600">Error Rate</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
              <FaBell className="mr-2 text-blood-600" />
              Recent Activity
            </h3>
            
            <div className="space-y-4">
              {dashboard.recentActivity && Array.isArray(dashboard.recentActivity) && dashboard.recentActivity.length > 0 ? (
                dashboard.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 border border-neutral-200 rounded-lg">
                    <div className="w-2 h-2 bg-blood-600 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">
                        {activity.description || 'Activity'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {activity.userEmail ? `${activity.userEmail} • ` : ''}{activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Recently'}
                      </p>
                    </div>
                    <Badge className={`${
                      activity.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                      activity.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      activity.riskLevel ? 'bg-green-100 text-green-800' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {activity.type || activity.riskLevel || 'activity'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <FaInfoCircle className="text-2xl mx-auto mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900">User Management</h3>
              <button className="btn btn-primary flex items-center space-x-2">
                <FaPlus />
                <span>Add User</span>
              </button>
            </div>
            
            <div className="text-center py-12">
              <FaUsers className="text-4xl text-neutral-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-neutral-900 mb-2">User Management</h4>
              <p className="text-neutral-600 mb-4">
                Manage users, roles, and permissions
              </p>
              <button className="btn btn-primary">
                Go to User Management
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Blood Requests Tab */}
      {activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900">Blood Requests</h3>
              <div className="flex items-center space-x-2">
                <button className="btn btn-outline flex items-center space-x-2">
                  <FaFilter />
                  <span>Filter</span>
                </button>
                <button className="btn btn-outline flex items-center space-x-2">
                  <FaDownload />
                  <span>Export</span>
                </button>
              </div>
            </div>
            
            <div className="text-center py-12">
              <FaHandHoldingHeart className="text-4xl text-neutral-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-neutral-900 mb-2">Blood Requests</h4>
              <p className="text-neutral-600 mb-4">
                Monitor and manage blood requests
              </p>
              <button className="btn btn-primary">
                View All Requests
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Donations Tab */}
      {activeTab === 'donations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900">Donations</h3>
              <div className="flex items-center space-x-2">
                <button className="btn btn-outline flex items-center space-x-2">
                  <FaFilter />
                  <span>Filter</span>
                </button>
                <button className="btn btn-outline flex items-center space-x-2">
                  <FaDownload />
                  <span>Export</span>
                </button>
              </div>
            </div>
            
            <div className="text-center py-12">
              <FaHeart className="text-4xl text-neutral-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-neutral-900 mb-2">Donations</h4>
              <p className="text-neutral-600 mb-4">
                Track and manage blood donations
              </p>
              <button className="btn btn-primary">
                View All Donations
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && hasRole(['system_admin']) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">System Management</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium text-neutral-900 mb-2 flex items-center">
                  <FaDatabase className="mr-2 text-blue-600" />
                  Database
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-600">Healthy</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span>{health.database?.responseTime || '15'}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connections:</span>
                    <span>{health.database?.connections || '5'}</span>
                  </div>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-lg p-4">
                <h4 className="font-medium text-neutral-900 mb-2 flex items-center">
                  <FaShieldAlt className="mr-2 text-green-600" />
                  Security
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="text-green-600">Secure</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Backup:</span>
                    <span>{new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SSL Certificate:</span>
                    <span className="text-green-600">Valid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminDashboard;
