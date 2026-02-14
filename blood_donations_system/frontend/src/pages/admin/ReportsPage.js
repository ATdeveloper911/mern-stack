import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaFileAlt, 
  FaDownload, 
  FaCalendarAlt, 
  FaFilter, 
  FaChartBar, 
  FaChartPie, 
  FaChartLine, 
  FaEye, 
  FaPrint, 
  FaShare, 
  FaHeart, 
  FaHandHoldingHeart, 
  FaUsers, 
  FaTint,
  FaMapMarkerAlt,
  FaClock,
  FaCheckCircle,
  FaBell,
  FaExclamationTriangle,
  FaInfoCircle,
  FaSync
} from 'react-icons/fa';
import { useQuery, useMutation } from 'react-query';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const ReportsPage = () => {
  const { user, hasRole } = useAuth();
  
  // State
  const [selectedReport, setSelectedReport] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filters, setFilters] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Fetch reports data with real-time refresh
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery(
    ['reports', { dateFrom, dateTo, filters }],
    () => adminAPI.getReports({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      filters: Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined
    }),
    {
      enabled: hasRole(['system_admin']),
      refetchInterval: 60000, // Refresh every minute
      onError: (error) => {
        console.error('Reports query error:', error);
        toast.error('Failed to load reports data');
      }
    }
  );

  // Generate report mutation with CSV download
  const generateReportMutation = useMutation(
    (reportData) => adminAPI.generateReport(reportData),
    {
      onSuccess: (response, variables) => {
        try {
          // Axios returns an object; data may be a Blob or string depending on server
          let blob;
          if (response?.data instanceof Blob) {
            blob = response.data;
          } else if (typeof response?.data === 'string') {
            blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
          } else if (response) {
            // Fallback: some axios versions put raw response in request.response
            const raw = response?.request?.response;
            blob = new Blob([raw || ''], { type: 'text/csv;charset=utf-8;' });
          }

          const disposition = response?.headers?.['content-disposition'] || '';
          const match = disposition.match(/filename="?([^";]+)"?/i);
          const filename = match?.[1] || `${variables?.type || 'report'}-${Date.now()}.csv`;

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success('Report generated and downloaded successfully');
        } catch (e) {
          console.error('Download handling error:', e);
          toast.error('Generated report, but failed to download');
        }
      },
      onError: (error) => {
        console.error('Generate report error:', error);
        const msg = error?.response?.data?.message || 'Failed to generate report';
        toast.error(msg);
      }
    }
  );

  const reportsPayload = reportsData?.data?.data || reportsData?.data || {};
  const reports = reportsPayload.reports || {};
  const dateRange = reportsPayload.dateRange || {};

  // Available report types
  const reportTypes = [
    {
      id: 'donation_summary',
      name: 'Donation Summary Report',
      description: 'Comprehensive overview of blood donations',
      icon: FaHeart,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      id: 'request_analysis',
      name: 'Blood Request Analysis',
      description: 'Analysis of blood requests and fulfillment',
      icon: FaHandHoldingHeart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'user_activity',
      name: 'User Activity Report',
      description: 'User engagement and activity metrics',
      icon: FaUsers,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'geographic_distribution',
      name: 'Geographic Distribution',
      description: 'Blood donation and request distribution by location',
      icon: FaMapMarkerAlt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'blood_type_analysis',
      name: 'Blood Type Analysis',
      description: 'Analysis of blood types and compatibility',
      icon: FaTint,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      id: 'system_performance',
      name: 'System Performance Report',
      description: 'System metrics and performance indicators',
      icon: FaChartLine,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  // Handle report generation
  const handleGenerateReport = () => {
    if (!selectedReport) {
      toast.error('Please select a report type');
      return;
    }
    
    const reportData = {
      type: selectedReport,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    };
    
    generateReportMutation.mutate(reportData);
  };

  // Handle preview report
  const handlePreviewReport = (reportTypeId) => {
    const reportType = reportTypes.find(rt => rt.id === reportTypeId);
    const key = getReportKey(reportTypeId);
    let data = reports[key];
    if (!data && reportTypeId === 'blood_type_analysis') {
      // Derive from donationSummary.byBloodType
      const byBT = reports?.donationSummary?.byBloodType || {};
      data = Object.entries(byBT).map(([bt, vals]) => ({ bloodType: bt, count: vals.count || 0, units: vals.units || 0 }));
    }
    setPreviewData({
      type: reportTypeId,
      name: reportType?.name,
      data
    });
    setShowPreviewModal(true);
  };

  // Get report key from report type ID
  const getReportKey = (reportTypeId) => {
    const keyMap = {
      'donation_summary': 'donationSummary',
      'request_analysis': 'requestAnalysis',
      'user_activity': 'userActivity',
      'geographic_distribution': 'geographicDistribution',
      'blood_type_analysis': 'bloodTypeAnalysis',
      'system_performance': 'systemPerformance'
    };
    return keyMap[reportTypeId] || '';
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  if (reportsLoading) {
    return <LoadingSpinner fullScreen text="Loading reports..." />;
  }

  if (!hasRole(['system_admin'])) {
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
          <h1 className="text-2xl font-bold text-neutral-900">System Reports & Analytics</h1>
          <p className="text-neutral-600 mt-1">
            Generate and view comprehensive system reports with real-time data
          </p>
        </div>
        <Button
          onClick={() => refetchReports()}
          variant="outline"
          className="mt-4 sm:mt-0"
        >
          <FaSync className="mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Statistics Overview */}
      {reports && Object.keys(reports).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Donation Summary Stats */}
          {reports.donationSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-red-50 via-pink-50 to-red-50 rounded-xl shadow-lg border-2 border-red-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 shadow-lg">
                    <FaHeart className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Donations</h3>
                    <p className="text-xs text-neutral-600 uppercase tracking-wide">Blood Donations</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-4xl font-bold text-red-600 mb-1">
                  {reports.donationSummary.total || 0}
                </div>
                <p className="text-sm text-neutral-600">Total donations</p>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-red-200">
                <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2">By Status</p>
                {Object.entries(reports.donationSummary.byStatus || {}).slice(0, 3).map(([status, count]) => {
                  const total = reports.donationSummary.total || 1;
                  const percentage = ((count / total) * 100).toFixed(0);
                  const statusColors = {
                    'scheduled': 'bg-blue-500',
                    'in_progress': 'bg-yellow-500',
                    'completed': 'bg-green-500',
                    'cancelled': 'bg-red-500',
                    'pending': 'bg-gray-500'
                  };
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-neutral-700 capitalize">{status.replace('_', ' ')}</span>
                        <Badge className={`${statusColors[status] || 'bg-gray-500'} text-white font-bold`}>
                          {count}
                        </Badge>
                      </div>
                      <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`${statusColors[status] || 'bg-gray-500'} h-1.5 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Request Analysis Stats */}
          {reports.requestAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 rounded-xl shadow-lg border-2 border-blue-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                    <FaHandHoldingHeart className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">Requests</h3>
                    <p className="text-xs text-neutral-600 uppercase tracking-wide">Blood Requests</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-4xl font-bold text-blue-600 mb-1">
                  {reports.requestAnalysis.total || 0}
                </div>
                <p className="text-sm text-neutral-600">Total requests</p>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-blue-200">
                <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2">By Status</p>
                {Object.entries(reports.requestAnalysis.byStatus || {}).slice(0, 3).map(([status, count]) => {
                  const total = reports.requestAnalysis.total || 1;
                  const percentage = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-neutral-700 capitalize">{status}</span>
                        <Badge className="bg-blue-500 text-white font-bold">
                          {count}
                        </Badge>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* System Performance Stats */}
          {reports.systemPerformance && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 rounded-xl shadow-lg border-2 border-indigo-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                    <FaChartLine className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">System</h3>
                    <p className="text-xs text-neutral-600 uppercase tracking-wide">Performance</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaUsers className="text-indigo-600 text-sm" />
                      <span className="text-xs font-medium text-neutral-600">Users</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {(reports.systemPerformance.totalUsers || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaHeart className="text-red-500 text-sm" />
                      <span className="text-xs font-medium text-neutral-600">Donations</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {(reports.systemPerformance.totalDonations || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaHandHoldingHeart className="text-blue-500 text-sm" />
                      <span className="text-xs font-medium text-neutral-600">Requests</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {(reports.systemPerformance.totalRequests || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaBell className="text-yellow-500 text-sm" />
                      <span className="text-xs font-medium text-neutral-600">Notifications</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {(reports.systemPerformance.totalNotifications || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Report Generation */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-6">Generate New Report</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Select Report Type
            </label>
            <div className="space-y-3">
              {reportTypes.map((reportType) => {
                const Icon = reportType.icon;
                return (
                  <div
                    key={reportType.id}
                    onClick={() => setSelectedReport(reportType.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedReport === reportType.id
                        ? 'border-blood-500 bg-blood-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${reportType.bgColor}`}>
                        <Icon className={`text-lg ${reportType.color}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900">{reportType.name}</h4>
                        <p className="text-sm text-neutral-600">{reportType.description}</p>
                      </div>
                      {selectedReport === reportType.id && (
                        <FaCheckCircle className="text-blood-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Report Settings */}
          <div className="space-y-6">
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
            {selectedReport && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Additional Filters
                </label>
                <div className="space-y-3">
                  {selectedReport === 'donation_summary' && (
                    <>
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
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Status</label>
                        <select
                          value={filters.donationStatus || ''}
                          onChange={(e) => handleFilterChange('donationStatus', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                        >
                          <option value="">All Status</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {selectedReport === 'request_analysis' && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-4">
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedReport || generateReportMutation.isLoading}
                isLoading={generateReportMutation.isLoading}
                className="w-full"
              >
                {generateReportMutation.isLoading ? (
                  <>
                    <FaChartBar className="animate-pulse mr-2" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FaDownload className="mr-2" />
                    Generate & Download CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-6">Available Reports</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((reportType) => {
            const Icon = reportType.icon;
            const reportKey = getReportKey(reportType.id);
            let reportData = reports[reportKey];
            if (!reportData && reportType.id === 'blood_type_analysis') {
              const byBT = reports?.donationSummary?.byBloodType || {};
              reportData = Object.keys(byBT).length > 0 ? byBT : null;
            }
            
            return (
              <div
                key={reportType.id}
                className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${reportType.bgColor}`}>
                    <Icon className={`text-lg ${reportType.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900">{reportType.name}</h4>
                    <p className="text-xs text-neutral-600">{reportType.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewReport(reportType.id)}
                    className="flex-1"
                  >
                    <FaEye className="mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const type = reportType.id;
                      const payload = {
                        type,
                        dateFrom: dateFrom || undefined,
                        dateTo: dateTo || undefined,
                        filters: Object.keys(filters).length > 0 ? filters : undefined
                      };
                      generateReportMutation.mutate(payload);
                    }}
                    className="flex-1"
                  >
                    <FaDownload className="mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={previewData?.name || "Report Preview"}
        size="xl"
      >
        {previewData && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  {reportTypes.find(rt => rt.id === previewData.type) && (
                    <div className={`p-2 rounded-lg ${reportTypes.find(rt => rt.id === previewData.type).bgColor}`}>
                      {React.createElement(reportTypes.find(rt => rt.id === previewData.type).icon, {
                        className: `${reportTypes.find(rt => rt.id === previewData.type).color} text-xl`
                      })}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-neutral-900">
                    {previewData.name}
                  </h3>
                </div>
                {dateRange.startDate && dateRange.endDate && (
                  <div className="flex items-center space-x-2 text-sm text-neutral-600">
                    <FaCalendarAlt />
                    <span>
                      {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => {
                  const payload = {
                    type: previewData.type,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    filters: Object.keys(filters).length > 0 ? filters : undefined
                  };
                  generateReportMutation.mutate(payload);
                }}
                className="bg-blood-600 hover:bg-blood-700"
              >
                <FaDownload className="mr-2" />
                Download CSV
              </Button>
            </div>
            
            {/* Content */}
            <div className="max-h-[600px] overflow-y-auto">
              {previewData.data ? (
                <div className="space-y-6">
                  {/* Donation Summary */}
                  {previewData.type === 'donation_summary' && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <FaHeart className="text-red-600 text-2xl" />
                          <h4 className="text-lg font-bold text-neutral-900">Total Donations</h4>
                        </div>
                        <div className="text-4xl font-bold text-red-600 mb-2">
                          {previewData.data.total || 0}
                        </div>
                        <p className="text-sm text-neutral-600">Donations in selected period</p>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-neutral-900 mb-3 flex items-center">
                          <FaChartBar className="mr-2 text-blood-600" />
                          Donations by Status
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(previewData.data.byStatus || {}).map(([status, count]) => {
                            const total = previewData.data.total || 1;
                            const percentage = ((count / total) * 100).toFixed(1);
                            const statusColors = {
                              'scheduled': 'bg-blue-500',
                              'in_progress': 'bg-yellow-500',
                              'completed': 'bg-green-500',
                              'cancelled': 'bg-red-500',
                              'pending': 'bg-gray-500'
                            };
                            return (
                              <div key={status} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-neutral-900 capitalize">{status.replace('_', ' ')}</span>
                                  <Badge className={`${statusColors[status] || 'bg-gray-500'} text-white`}>
                                    {count}
                                  </Badge>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-2">
                                  <div
                                    className={`${statusColors[status] || 'bg-gray-500'} h-2 rounded-full transition-all`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">{percentage}% of total</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Request Analysis */}
                  {previewData.type === 'request_analysis' && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <FaHandHoldingHeart className="text-blue-600 text-2xl" />
                          <h4 className="text-lg font-bold text-neutral-900">Total Requests</h4>
                        </div>
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {previewData.data.total || 0}
                        </div>
                        <p className="text-sm text-neutral-600">Blood requests in selected period</p>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-neutral-900 mb-3 flex items-center">
                          <FaChartBar className="mr-2 text-blood-600" />
                          Requests by Status
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {Object.entries(previewData.data.byStatus || {}).map(([status, count]) => {
                            const total = previewData.data.total || 1;
                            const percentage = ((count / total) * 100).toFixed(1);
                            return (
                              <div key={status} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-neutral-900 capitalize">{status}</span>
                                  <Badge className="bg-blue-100 text-blue-800">{count}</Badge>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">{percentage}% of total</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-neutral-900 mb-3 flex items-center">
                          <FaExclamationTriangle className="mr-2 text-orange-600" />
                          Requests by Urgency
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(previewData.data.byUrgency || {}).map(([urgency, count]) => {
                            const urgencyColors = {
                              'critical': 'bg-red-600',
                              'high': 'bg-orange-500',
                              'medium': 'bg-yellow-500',
                              'low': 'bg-green-500'
                            };
                            return (
                              <div key={urgency} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm text-center">
                                <div className={`${urgencyColors[urgency] || 'bg-gray-500'} text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2 text-xl font-bold`}>
                                  {count}
                                </div>
                                <p className="font-medium text-neutral-900 capitalize">{urgency}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* System Performance */}
                  {previewData.type === 'system_performance' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'totalUsers', label: 'Total Users', icon: FaUsers, color: 'blue' },
                        { key: 'totalDonations', label: 'Total Donations', icon: FaHeart, color: 'red' },
                        { key: 'totalRequests', label: 'Total Requests', icon: FaHandHoldingHeart, color: 'blue' },
                        { key: 'totalNotifications', label: 'Notifications', icon: FaBell, color: 'yellow' },
                        { key: 'totalAuditEntries', label: 'Audit Entries', icon: FaFileAlt, color: 'purple' }
                      ].map(({ key, label, icon: Icon, color }) => {
                        const value = previewData.data[key] || 0;
                        const colorClasses = {
                          blue: 'bg-blue-100 text-blue-600 border-blue-200',
                          red: 'bg-red-100 text-red-600 border-red-200',
                          yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
                          purple: 'bg-purple-100 text-purple-600 border-purple-200'
                        };
                        return (
                          <div key={key} className={`p-6 rounded-lg border-2 ${colorClasses[color]} shadow-sm`}>
                            <div className="flex items-center space-x-3 mb-3">
                              <Icon className="text-2xl" />
                              <h5 className="font-semibold text-neutral-900">{label}</h5>
                            </div>
                            <div className="text-3xl font-bold">{value.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Geographic Distribution */}
                  {previewData.type === 'geographic_distribution' && (
                    <div>
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200 mb-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <FaMapMarkerAlt className="text-purple-600 text-2xl" />
                          <h4 className="text-lg font-bold text-neutral-900">Geographic Distribution</h4>
                        </div>
                        <p className="text-sm text-neutral-600">Top locations by donation activity</p>
                      </div>
                      
                      {previewData.data.length > 0 ? (
                        <div className="space-y-3">
                          {previewData.data.slice(0, 15).map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <h6 className="font-semibold text-neutral-900">{item.city || 'Unknown'}</h6>
                                    <p className="text-sm text-neutral-600">{item.units || 0} units collected</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-purple-600">{item.donations || 0}</div>
                                  <p className="text-xs text-neutral-500">donations</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-neutral-500">
                          <FaMapMarkerAlt className="text-4xl mx-auto mb-2 text-neutral-300" />
                          <p>No geographic data available</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* User Activity */}
                  {previewData.type === 'user_activity' && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-semibold text-neutral-900 mb-3 flex items-center">
                          <FaUsers className="mr-2 text-green-600" />
                          Users by Role
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(previewData.data.byRole || {}).map(([role, count]) => {
                            const total = Object.values(previewData.data.byRole || {}).reduce((a, b) => a + b, 0) || 1;
                            const percentage = ((count / total) * 100).toFixed(1);
                            return (
                              <div key={role} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-neutral-900 capitalize">{role.replace('_', ' ')}</span>
                                  <Badge className="bg-green-100 text-green-800">{count}</Badge>
                                </div>
                                <div className="w-full bg-neutral-200 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">{percentage}% of total</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-semibold text-neutral-900 mb-3 flex items-center">
                          <FaTint className="mr-2 text-red-600" />
                          Users by Blood Type
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(previewData.data.byBloodType || {}).map(([bt, count]) => (
                            <div key={bt} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm text-center">
                              <div className="text-2xl font-bold text-red-600 mb-1">{count}</div>
                              <p className="text-sm font-medium text-neutral-900">{bt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Blood Type Analysis */}
                  {previewData.type === 'blood_type_analysis' && previewData.data && (
                    <div>
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200 mb-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <FaTint className="text-orange-600 text-2xl" />
                          <h4 className="text-lg font-bold text-neutral-900">Blood Type Analysis</h4>
                        </div>
                        <p className="text-sm text-neutral-600">Distribution across all blood types</p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(previewData.data).map(([bt, data]) => {
                          const count = typeof data === 'object' ? data.count : data;
                          const units = typeof data === 'object' ? data.units : 0;
                          return (
                            <div key={bt} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm text-center">
                              <div className="text-xl font-bold text-orange-600 mb-1">{count || 0}</div>
                              <p className="text-sm font-medium text-neutral-900 mb-1">{bt}</p>
                              {units > 0 && (
                                <p className="text-xs text-neutral-500">{units} units</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  <FaInfoCircle className="text-5xl mx-auto mb-4 text-neutral-300" />
                  <p className="text-lg font-medium">No data available for this report</p>
                  <p className="text-sm mt-2">Try adjusting the date range or filters</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReportsPage;
