import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaDownload, 
  FaFileCsv, 
  FaFileExcel, 
  FaFilePdf, 
  FaDatabase, 
  FaUsers, 
  FaHeart, 
  FaHandHoldingHeart, 
  FaBell, 
  FaShieldAlt, 
  FaCalendarAlt, 
  FaFilter, 
  FaCheckCircle, 
  FaClock, 
  FaSpinner, 
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import { useMutation } from 'react-query';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';

const DataExport = () => {
  const { user, hasRole } = useAuth();
  
  // State
  const [selectedDataType, setSelectedDataType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filters, setFilters] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Export data mutation
  const exportMutation = useMutation(
    (exportData) => adminAPI.exportData(exportData),
    {
      onSuccess: (response) => {
        // Handle successful export
        const exportRecord = {
          id: Date.now(),
          dataType: selectedDataType,
          format: selectedFormat,
          status: 'completed',
          createdAt: new Date(),
          downloadUrl: response.data.downloadUrl
        };
        setExportHistory(prev => [exportRecord, ...prev]);
        setIsExporting(false);
        setShowExportModal(false);
        
        // Trigger download
        if (response.data.downloadUrl) {
          const link = document.createElement('a');
          link.href = response.data.downloadUrl;
          link.download = `${selectedDataType}_${new Date().toISOString().split('T')[0]}.${selectedFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      },
      onError: (error) => {
        console.error('Export failed:', error);
        setIsExporting(false);
      }
    }
  );

  // Data types available for export
  const dataTypes = [
    {
      id: 'users',
      name: 'Users',
      description: 'Export all user data including profiles, roles, and contact information',
      icon: FaUsers,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'blood_requests',
      name: 'Blood Requests',
      description: 'Export blood request data including status, urgency, and location',
      icon: FaHandHoldingHeart,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      id: 'donations',
      name: 'Donations',
      description: 'Export donation records including dates, quantities, and verification status',
      icon: FaHeart,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Export notification history and delivery status',
      icon: FaBell,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'audit_trail',
      name: 'Audit Trail',
      description: 'Export system audit logs and security events',
      icon: FaShieldAlt,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Export analytics data and system metrics',
      icon: FaDatabase,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  // Export formats
  const exportFormats = [
    { id: 'csv', name: 'CSV', icon: FaFileCsv, description: 'Comma-separated values' },
    { id: 'excel', name: 'Excel', icon: FaFileExcel, description: 'Microsoft Excel format' },
    { id: 'pdf', name: 'PDF', icon: FaFilePdf, description: 'Portable Document Format' }
  ];

  // Handle export
  const handleExport = () => {
    if (!selectedDataType) return;
    
    setIsExporting(true);
    const exportData = {
      dataType: selectedDataType,
      format: selectedFormat,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    };
    
    exportMutation.mutate(exportData);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return FaCheckCircle;
      case 'processing':
        return FaSpinner;
      case 'failed':
        return FaTimes;
      default:
        return FaClock;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!hasRole(['system_admin', 'medical_admin'])) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Access Denied</h2>
          <p className="text-neutral-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Data Export</h1>
          <p className="text-neutral-600 mt-1">
            Export system data in various formats for analysis and reporting
          </p>
        </div>
      </div>

      {/* Export Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-6">Export Configuration</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Type Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Select Data Type
            </label>
            <div className="space-y-3">
              {dataTypes.map((dataType) => {
                const Icon = dataType.icon;
                return (
                  <div
                    key={dataType.id}
                    onClick={() => setSelectedDataType(dataType.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedDataType === dataType.id
                        ? 'border-blood-500 bg-blood-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${dataType.bgColor}`}>
                        <Icon className={`text-lg ${dataType.color}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900">{dataType.name}</h4>
                        <p className="text-sm text-neutral-600">{dataType.description}</p>
                      </div>
                      {selectedDataType === dataType.id && (
                        <FaCheck className="text-blood-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Settings */}
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Export Format
              </label>
              <div className="space-y-2">
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedFormat === format.id
                          ? 'border-blood-500 bg-blood-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="text-lg text-neutral-600" />
                        <div>
                          <h4 className="font-medium text-neutral-900">{format.name}</h4>
                          <p className="text-sm text-neutral-600">{format.description}</p>
                        </div>
                        {selectedFormat === format.id && (
                          <FaCheck className="text-blood-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-3">
                Date Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Additional Filters */}
            {selectedDataType && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Additional Filters
                </label>
                <div className="space-y-3">
                  {selectedDataType === 'users' && (
                    <>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Role</label>
                        <select
                          value={filters.role || ''}
                          onChange={(e) => handleFilterChange('role', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                        >
                          <option value="">All Roles</option>
                          <option value="donor">Donor</option>
                          <option value="recipient">Recipient</option>
                          <option value="medical_admin">Medical Admin</option>
                          <option value="system_admin">System Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Status</label>
                        <select
                          value={filters.status || ''}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {selectedDataType === 'blood_requests' && (
                    <>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Status</label>
                        <select
                          value={filters.status || ''}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                        >
                          <option value="">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="matched">Matched</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Urgency</label>
                        <select
                          value={filters.urgency || ''}
                          onChange={(e) => handleFilterChange('urgency', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                        >
                          <option value="">All Urgency Levels</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {selectedDataType === 'donations' && (
                    <>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Status</label>
                        <select
                          value={filters.status || ''}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                        >
                          <option value="">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                          <option value="used">Used</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Blood Type</label>
                        <select
                          value={filters.bloodType || ''}
                          onChange={(e) => handleFilterChange('bloodType', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                        >
                          <option value="">All Blood Types</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="pt-4">
              <Button
                onClick={handleExport}
                disabled={!selectedDataType || isExporting}
                isLoading={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FaDownload className="mr-2" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">Export History</h3>
          
          <div className="space-y-3">
            {exportHistory.map((exportRecord) => {
              const StatusIcon = getStatusIcon(exportRecord.status);
              return (
                <div
                  key={exportRecord.id}
                  className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <StatusIcon className={`text-lg ${getStatusColor(exportRecord.status)}`} />
                    <div>
                      <h4 className="font-medium text-neutral-900">
                        {dataTypes.find(dt => dt.id === exportRecord.dataType)?.name}
                      </h4>
                      <p className="text-sm text-neutral-600">
                        {exportRecord.format.toUpperCase()} • {exportRecord.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(exportRecord.status)}>
                      {exportRecord.status}
                    </Badge>
                    {exportRecord.status === 'completed' && exportRecord.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = exportRecord.downloadUrl;
                          link.download = `${exportRecord.dataType}_${exportRecord.createdAt.toISOString().split('T')[0]}.${exportRecord.format}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <FaDownload className="mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <FaInfoCircle className="text-blue-600 text-lg mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Export Information</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Exported data includes all relevant fields and relationships</li>
              <li>• Large datasets may take several minutes to process</li>
              <li>• Exported files are available for download for 7 days</li>
              <li>• Sensitive data is encrypted in exported files</li>
              <li>• All exports are logged for audit purposes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
