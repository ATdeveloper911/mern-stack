import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BadgeDollarSign, FileText, Users } from 'lucide-react';
import api from '../../utils/api';

const formatMoney = (value) => {
  const numberValue = Number(value || 0);
  return numberValue.toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  });
};

const DashboardHome = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/analytics');
        if (mounted) setAnalytics(res.data);
      } catch (e) {
        if (mounted) setAnalytics(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const trends = analytics?.budgetTrends || [];
    const revenue = trends.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);

    return {
      users: analytics?.users?.total ?? 0,
      bookings: analytics?.budgets?.total ?? 0,
      revenue,
      content: analytics?.destinations?.total ?? 0,
    };
  }, [analytics]);

  const topDestinations = useMemo(() => {
    return (analytics?.topDestinations || []).map((d) => ({
      destination: d._id,
      count: d.count,
    }));
  }, [analytics]);

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h2>Executive Overview</h2>
          <p className="ad-page-subtitle">High-level metrics across the platform.</p>
        </div>
      </div>

      <div className="ad-grid-4">
        <div className="ad-card">
          <div className="ad-stat">
            <div>
              <strong>{loading ? '—' : stats.users}</strong>
              <span>Total Users</span>
            </div>
            <div className="ad-stat-icon" aria-hidden="true">
              <Users size={18} />
            </div>
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-stat">
            <div>
              <strong>{loading ? '—' : stats.bookings}</strong>
              <span>Total Bookings</span>
            </div>
            <div className="ad-stat-icon" aria-hidden="true">
              <Activity size={18} />
            </div>
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-stat">
            <div>
              <strong>{loading ? '—' : formatMoney(stats.revenue)}</strong>
              <span>Revenue</span>
            </div>
            <div className="ad-stat-icon" aria-hidden="true">
              <BadgeDollarSign size={18} />
            </div>
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-stat">
            <div>
              <strong>{loading ? '—' : stats.content}</strong>
              <span>Active Content</span>
            </div>
            <div className="ad-stat-icon" aria-hidden="true">
              <FileText size={18} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="ad-grid-2">
        <div className="ad-card ad-card-pad">
          <div className="ad-page-head" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Recent Activity</h2>
              <p className="ad-page-subtitle">A snapshot of what’s happening now.</p>
            </div>
          </div>

          <table className="ad-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Users</td>
                <td>Active</td>
                <td>{analytics?.users?.active ?? 0}</td>
              </tr>
              <tr>
                <td>Destinations</td>
                <td>Popular</td>
                <td>{analytics?.destinations?.popular ?? 0}</td>
              </tr>
              <tr>
                <td>Conversations</td>
                <td>Total</td>
                <td>{analytics?.conversations?.total ?? 0}</td>
              </tr>
            </tbody>
          </table>

          {topDestinations.length ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 950, color: 'var(--ad-primary)', marginBottom: 8 }}>Top Destinations</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {topDestinations.slice(0, 5).map((d) => (
                  <div
                    key={d.destination}
                    className="ad-card"
                    style={{ padding: 12, borderRadius: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}
                  >
                    <div style={{ fontWeight: 900 }}>{d.destination || 'Unknown'}</div>
                    <span className="ad-badge gold">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ad-card ad-card-pad">
          <div className="ad-page-head" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>Quick Actions</h2>
              <p className="ad-page-subtitle">Jump straight into management tasks.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <button type="button" className="ad-btn" onClick={() => navigate('/admin/users')}>
              User Management
            </button>
            <button type="button" className="ad-btn" onClick={() => navigate('/admin/accommodations')}>
              Accommodations
            </button>
            <button type="button" className="ad-btn" onClick={() => navigate('/admin/content')}>
              Content
            </button>
            <button type="button" className="ad-btn ad-btn-primary" onClick={() => navigate('/admin/reports')}>
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
