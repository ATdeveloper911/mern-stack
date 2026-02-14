import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaCog, 
  FaSave, 
  FaUndo, 
  FaShieldAlt, 
  FaDatabase, 
  FaBell, 
  FaGlobe, 
  FaKey, 
  FaUserShield,
  FaServer,
  FaCloud,
  FaLock,
  FaUnlock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEdit,
  FaTrash,
  FaPlus,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';

const SystemSettings = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState('general');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSetting, setDeletingSetting] = useState(null);

  // Fetch system settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery(
    'system-settings',
    () => adminAPI.getSystemSettings(),
    {
      enabled: hasRole(['system_admin']),
    }
  );

  // Update setting mutation
  const updateSettingMutation = useMutation(
    ({ key, value }) => adminAPI.updateSystemSetting(key, value),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('system-settings');
        setShowEditModal(false);
        setEditingSetting(null);
      },
    }
  );

  // Delete setting mutation
  const deleteSettingMutation = useMutation(
    (key) => adminAPI.deleteSystemSetting(key),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('system-settings');
        setShowDeleteModal(false);
        setDeletingSetting(null);
      },
    }
  );

  const settings = settingsData?.data?.settings || {};

  // Get tab options
  const tabOptions = [
    { id: 'general', label: 'General', icon: FaCog },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
    { id: 'database', label: 'Database', icon: FaDatabase },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'api', label: 'API', icon: FaGlobe },
    { id: 'backup', label: 'Backup', icon: FaCloud }
  ];

  // Get setting value
  const getSettingValue = (key) => {
    return settings[key]?.value || '';
  };

  // Get setting type
  const getSettingType = (key) => {
    return settings[key]?.type || 'text';
  };

  // Get setting description
  const getSettingDescription = (key) => {
    return settings[key]?.description || '';
  };

  // Handle edit setting
  const handleEditSetting = (key) => {
    setEditingSetting({
      key,
      value: getSettingValue(key),
      type: getSettingType(key),
      description: getSettingDescription(key)
    });
    setShowEditModal(true);
  };

  // Handle delete setting
  const handleDeleteSetting = (key) => {
    setDeletingSetting(key);
    setShowDeleteModal(true);
  };

  // Handle update setting
  const handleUpdateSetting = (key, value) => {
    updateSettingMutation.mutate({ key, value });
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    deleteSettingMutation.mutate(deletingSetting);
  };

  if (settingsLoading) {
    return <LoadingSpinner fullScreen text="Loading system settings..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">System Settings</h1>
          <p className="text-neutral-600 mt-1">
            Configure system-wide settings and preferences
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <button className="btn btn-outline flex items-center space-x-2">
            <FaUndo />
            <span>Reset to Defaults</span>
          </button>
          
          <button className="btn btn-primary flex items-center space-x-2">
            <FaSave />
            <span>Save All Changes</span>
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

      {/* General Settings */}
      {activeTab === 'general' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center">
              <FaCog className="mr-2 text-blood-600" />
              General Settings
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Application Name
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={getSettingValue('app_name')}
                      onChange={(e) => handleUpdateSetting('app_name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('app_name')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Application Version
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={getSettingValue('app_version')}
                      onChange={(e) => handleUpdateSetting('app_version', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('app_version')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Default Language
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={getSettingValue('default_language')}
                      onChange={(e) => handleUpdateSetting('default_language', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                    <button
                      onClick={() => handleEditSetting('default_language')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Time Zone
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={getSettingValue('timezone')}
                      onChange={(e) => handleUpdateSetting('timezone', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                    <button
                      onClick={() => handleEditSetting('timezone')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center">
              <FaShieldAlt className="mr-2 text-blood-600" />
              Security Settings
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Password Minimum Length
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="6"
                      max="32"
                      value={getSettingValue('password_min_length')}
                      onChange={(e) => handleUpdateSetting('password_min_length', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('password_min_length')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={getSettingValue('session_timeout')}
                      onChange={(e) => handleUpdateSetting('session_timeout', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('session_timeout')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable Two-Factor Authentication
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_2fa') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_2fa', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_2fa') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable IP Whitelist
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_ip_whitelist') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_ip_whitelist', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_ip_whitelist') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Database Settings */}
      {activeTab === 'database' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center">
              <FaDatabase className="mr-2 text-blood-600" />
              Database Settings
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Connection Pool Size
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={getSettingValue('db_pool_size')}
                      onChange={(e) => handleUpdateSetting('db_pool_size', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('db_pool_size')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Query Timeout (seconds)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={getSettingValue('db_query_timeout')}
                      onChange={(e) => handleUpdateSetting('db_query_timeout', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('db_query_timeout')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable Query Logging
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_query_logging') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_query_logging', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_query_logging') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable Slow Query Logging
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_slow_query_logging') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_slow_query_logging', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_slow_query_logging') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center">
              <FaBell className="mr-2 text-blood-600" />
              Notification Settings
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable Email Notifications
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_email_notifications') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_email_notifications', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_email_notifications') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable SMS Notifications
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_sms_notifications') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_sms_notifications', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_sms_notifications') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable Push Notifications
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_push_notifications') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_push_notifications', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_push_notifications') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Notification Rate Limit (per hour)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={getSettingValue('notification_rate_limit')}
                      onChange={(e) => handleUpdateSetting('notification_rate_limit', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('notification_rate_limit')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* API Settings */}
      {activeTab === 'api' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center">
              <FaGlobe className="mr-2 text-blood-600" />
              API Settings
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    API Rate Limit (requests per minute)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={getSettingValue('api_rate_limit')}
                      onChange={(e) => handleUpdateSetting('api_rate_limit', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('api_rate_limit')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    API Timeout (seconds)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={getSettingValue('api_timeout')}
                      onChange={(e) => handleUpdateSetting('api_timeout', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('api_timeout')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable API Logging
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_api_logging') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_api_logging', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_api_logging') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable CORS
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_cors') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_cors', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_cors') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Backup Settings */}
      {activeTab === 'backup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center">
              <FaCloud className="mr-2 text-blood-600" />
              Backup Settings
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Backup Frequency (hours)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={getSettingValue('backup_frequency')}
                      onChange={(e) => handleUpdateSetting('backup_frequency', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('backup_frequency')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Backup Retention (days)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={getSettingValue('backup_retention')}
                      onChange={(e) => handleUpdateSetting('backup_retention', e.target.value)}
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleEditSetting('backup_retention')}
                      className="p-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <FaEdit />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable Automatic Backup
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_automatic_backup') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_automatic_backup', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_automatic_backup') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Enable Cloud Backup
                  </label>
                  <div className="flex items-center space-x-2">
                    <Toggle
                      checked={getSettingValue('enable_cloud_backup') === 'true'}
                      onChange={(checked) => handleUpdateSetting('enable_cloud_backup', checked.toString())}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSettingValue('enable_cloud_backup') === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Edit Setting Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Setting"
        size="md"
      >
        {editingSetting && (
          <EditSettingForm
            setting={editingSetting}
            onSubmit={handleUpdateSetting}
            onCancel={() => setShowEditModal(false)}
            isLoading={updateSettingMutation.isLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Setting"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-neutral-600">
            Are you sure you want to delete this setting? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleteSettingMutation.isLoading}
            >
              Delete Setting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Edit Setting Form Component
const EditSettingForm = ({ setting, onSubmit, onCancel, isLoading }) => {
  const [value, setValue] = useState(setting.value);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(setting.key, value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Setting Key
        </label>
        <input
          type="text"
          value={setting.key}
          disabled
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Setting Value
        </label>
        {setting.type === 'boolean' ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        ) : (
          <input
            type={setting.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          />
        )}
      </div>

      {setting.description && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Description
          </label>
          <p className="text-sm text-neutral-600">{setting.description}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          Update Setting
        </Button>
      </div>
    </form>
  );
};

export default SystemSettings;
