import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaFileAlt,
  FaDownload,
  FaChartLine,
  FaHeart,
  FaHandHoldingHeart,
  FaUserMd,
  FaCalendarAlt,
  FaFilter,
  FaClock
} from 'react-icons/fa';
import { useQuery } from 'react-query';
import { adminAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

const MedicalReports = () => {
  const { user, hasRole } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Helper: map selectedPeriod to date range
  const getDateRange = (period) => {
    const end = new Date();
    const start = new Date();
    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7); break;
      case '30d':
        start.setDate(end.getDate() - 30); break;
      case '90d':
        start.setDate(end.getDate() - 90); break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1); break;
      default:
        start.setDate(end.getDate() - 30);
    }
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    return { startDate: fmt(start), endDate: fmt(end) };
  };

  // Fetch medical report data (authoritative for reports & export)
  const { startDate, endDate } = getDateRange(selectedPeriod);
  const { data: reportData, isLoading: reportLoading } = useQuery(
    ['medical-report', selectedPeriod, startDate, endDate],
    () => adminAPI.getMedicalReport({ startDate, endDate }),
    {
      enabled: hasRole(['medical_admin']),
      refetchInterval: 60000,
    }
  );

  const report = reportData?.data?.report || reportData?.data?.data?.report || {};

  // Also keep dashboard for any extra cards already wired
  const { data: dashboardData } = useQuery(
    ['medical-dashboard', selectedPeriod],
    () => adminAPI.getDashboard({ period: selectedPeriod }),
    { enabled: hasRole(['medical_admin']) }
  );
  const dashboard = dashboardData?.data?.dashboard || {};

  const exportDonationReport = () => {
    const rows = [];
    rows.push(['Donation Report']);
    rows.push([`Period: ${startDate} to ${endDate}`]);
    rows.push([]);
    rows.push(['Metric','Value']);
    rows.push(['Total Donations', report?.totals?.donations || 0]);
    rows.push(['Successful (completed)', report?.totals?.successfulDonations || 0]);
    rows.push([]);
    rows.push(['Donations By Status']);
    Object.entries(report?.donationsByStatus || {}).forEach(([k,v]) => rows.push([k, v]));
    rows.push([]);
    rows.push(['Testing Outcomes']);
    rows.push(['Suitable', report?.testing?.suitable || 0]);
    rows.push(['Unsuitable', report?.testing?.unsuitable || 0]);
    rows.push([]);
    rows.push(['Volumes (ml)']);
    rows.push(['Stored', report?.volumesMl?.stored || 0]);
    rows.push(['Distributed', report?.volumesMl?.distributed || 0]);
    rows.push(['Discarded', report?.volumesMl?.discarded || 0]);
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donation-report_${startDate}_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportRequestReport = () => {
    const rows = [];
    rows.push(['Blood Request Report']);
    rows.push([`Period: ${startDate} to ${endDate}`]);
    rows.push([]);
    rows.push(['Status','Count']);
    Object.entries(report?.requestsByStatus || {}).forEach(([k,v]) => rows.push([k, v]));
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blood-requests-report_${startDate}_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportVerificationReport = () => {
    const rows = [];
    rows.push(['Verification Report']);
    rows.push([`As of: ${endDate}`]);
    rows.push([]);
    rows.push(['Metric','Count']);
    rows.push(['Verified users', report?.verifications?.verified || 0]);
    rows.push(['Unverified users', report?.verifications?.unverified || 0]);
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report_${startDate}_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (reportLoading) {
    return <LoadingSpinner fullScreen text="Loading medical reports..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Medical Reports</h1>
          <p className="text-neutral-600 mt-1">
            Medical statistics and analytics for blood donations and requests
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blood-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => {
              const rows = [];
              rows.push(['Section','Metric','Value'].join(','));
              rows.push(['Totals','Donations', report?.totals?.donations || 0].join(','));
              rows.push(['Totals','SuccessfulDonations', report?.totals?.successfulDonations || 0].join(','));
              Object.entries(report?.donationsByStatus || {}).forEach(([k,v]) => rows.push(['DonationsByStatus', k, v].join(',')));
              rows.push(['Testing','Suitable', report?.testing?.suitable || 0].join(','));
              rows.push(['Testing','Unsuitable', report?.testing?.unsuitable || 0].join(','));
              rows.push(['Volumes(ml)','Stored', report?.volumesMl?.stored || 0].join(','));
              rows.push(['Volumes(ml)','Distributed', report?.volumesMl?.distributed || 0].join(','));
              rows.push(['Volumes(ml)','Discarded', report?.volumesMl?.discarded || 0].join(','));
              Object.entries(report?.requestsByStatus || {}).forEach(([k,v]) => rows.push(['RequestsByStatus', k, v].join(',')));
              (report?.inventoryByBloodType || []).forEach(i => rows.push(['Inventory', i.bloodType, i.units].join(',')));
              const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `medical-report_${startDate}_${endDate}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
          >
            <FaDownload />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total Blood Requests</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{(report.requestsByStatus && Object.values(report.requestsByStatus).reduce((a,b)=>a+b,0)) || dashboard.totalRequests || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <FaHandHoldingHeart className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total Donations</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{report.totals?.donations ?? dashboard.totalDonations ?? 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <FaHeart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Medical Verifications</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{report.verifications?.verified ?? dashboard.medicalVerifications ?? 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FaUserMd className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Pending Requests</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{(report.requestsByStatus?.pending) ?? dashboard.pendingRequests ?? 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <FaClock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Medical Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Medical Activity Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-neutral-600 mb-2">Completed Donations</p>
            <p className="text-2xl font-bold text-neutral-900">{report.totals?.successfulDonations ?? dashboard.successfulDonations ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600 mb-2">Critical Requests</p>
            <p className="text-2xl font-bold text-red-600">{(report.requestsByStatus?.critical) ?? dashboard.criticalRequests ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Available Reports</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <FaHeart className="h-8 w-8 text-red-600 mb-2" />
            <h4 className="font-medium text-neutral-900 mb-1">Donation Report</h4>
            <p className="text-sm text-neutral-600 mb-3">View detailed donation statistics</p>
            <Button variant="outline" size="sm" onClick={exportDonationReport}>Generate</Button>
          </div>
          
          <div className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <FaHandHoldingHeart className="h-8 w-8 text-red-600 mb-2" />
            <h4 className="font-medium text-neutral-900 mb-1">Blood Request Report</h4>
            <p className="text-sm text-neutral-600 mb-3">View blood request statistics</p>
            <Button variant="outline" size="sm" onClick={exportRequestReport}>Generate</Button>
          </div>
          
          <div className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <FaUserMd className="h-8 w-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-neutral-900 mb-1">Verification Report</h4>
            <p className="text-sm text-neutral-600 mb-3">View medical verification status</p>
            <Button variant="outline" size="sm" onClick={exportVerificationReport}>Generate</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalReports;

