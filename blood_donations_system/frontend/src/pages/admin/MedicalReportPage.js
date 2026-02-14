import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';

const formatDate = (d) => new Date(d).toISOString().slice(0, 10);

const MedicalReportPage = () => {
  const [startDate, setStartDate] = useState(formatDate(new Date(Date.now() - 30*24*60*60*1000)));
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  const { data, isLoading, error, refetch } = useQuery(
    ['medical-report', startDate, endDate],
    () => adminAPI.getMedicalReport({ startDate, endDate }),
    { keepPreviousData: true }
  );

  const report = data?.data?.data?.report || {};

  const exportCSV = () => {
    const rows = [];
    rows.push(['Section','Metric','Value'].join(','));
    rows.push(['Totals','Donations', report.totals?.donations || 0].join(','));
    rows.push(['Totals','SuccessfulDonations', report.totals?.successfulDonations || 0].join(','));
    Object.entries(report.donationsByStatus || {}).forEach(([k,v]) => rows.push(['DonationsByStatus', k, v].join(',')));
    rows.push(['Testing','Suitable', report.testing?.suitable || 0].join(','));
    rows.push(['Testing','Unsuitable', report.testing?.unsuitable || 0].join(','));
    rows.push(['Volumes(ml)','Stored', report.volumesMl?.stored || 0].join(','));
    rows.push(['Volumes(ml)','Distributed', report.volumesMl?.distributed || 0].join(','));
    rows.push(['Volumes(ml)','Discarded', report.volumesMl?.discarded || 0].join(','));
    Object.entries(report.requestsByStatus || {}).forEach(([k,v]) => rows.push(['RequestsByStatus', k, v].join(',')));
    (report.inventoryByBloodType || []).forEach(i => rows.push(['Inventory', i.bloodType, i.units].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-report_${startDate}_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-sm text-neutral-700 mb-1">Start date</label>
          <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-neutral-700 mb-1">End date</label>
          <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <button onClick={()=>refetch()} className="px-4 py-2 bg-blue-600 text-white rounded">Refresh</button>
        <button onClick={exportCSV} className="px-4 py-2 bg-neutral-800 text-white rounded">Export CSV</button>
      </div>

      {isLoading && <div>Loading report...</div>}
      {error && <div className="text-red-600">Failed to load report.</div>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Totals</h3>
            <div className="space-y-1 text-sm">
              <div>Donations: <b>{report.totals?.donations || 0}</b></div>
              <div>Successful donations (completed): <b>{report.totals?.successfulDonations || 0}</b></div>
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Donations by Status</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(report.donationsByStatus || {}).map(([k,v]) => (
                <div key={k}>{k}: <b>{v}</b></div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Testing Outcomes</h3>
            <div className="space-y-1 text-sm">
              <div>Suitable: <b>{report.testing?.suitable || 0}</b></div>
              <div>Unsuitable: <b>{report.testing?.unsuitable || 0}</b></div>
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Volumes (ml)</h3>
            <div className="space-y-1 text-sm">
              <div>Stored: <b>{report.volumesMl?.stored || 0}</b></div>
              <div>Distributed: <b>{report.volumesMl?.distributed || 0}</b></div>
              <div>Discarded: <b>{report.volumesMl?.discarded || 0}</b></div>
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Requests by Status</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(report.requestsByStatus || {}).map(([k,v]) => (
                <div key={k}>{k}: <b>{v}</b></div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded p-4">
            <h3 className="font-semibold mb-2">Inventory by Blood Type</h3>
            <div className="space-y-1 text-sm">
              {(report.inventoryByBloodType || []).map((i) => (
                <div key={i.bloodType}>{i.bloodType}: <b>{i.units}</b> units ({i.ml} ml)</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalReportPage;


