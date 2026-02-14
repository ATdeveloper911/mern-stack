import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { BarChart3, BadgeDollarSign, MapPinned, MessageSquare, TrendingUp, Users } from 'lucide-react';
import api from '../../utils/api';

const formatMoney = (value) => {
  const numberValue = Number(value || 0);
  return numberValue.toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  });
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const COLORS = {
  primary: '#1B4332',
  accent: '#D4A373',
  teal: '#2D6A4F',
  sky: '#3A86FF',
  coral: '#FF6B6B',
  violet: '#7C3AED',
  gray: 'rgba(15, 23, 42, 0.55)',
  grid: 'rgba(15, 23, 42, 0.08)',
  surface: 'rgba(255,255,255,0.9)',
};

const ChartTooltip = (props) => {
  const { active, payload, label } = props || {};
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: 14,
        padding: '10px 12px',
        boxShadow: '0 12px 40px rgba(2,6,23,0.12)',
      }}
    >
      <div style={{ fontWeight: 950, color: COLORS.primary, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gap: 4 }}>
        {payload.map((p, idx) => (
          <div key={`${p?.dataKey || p?.name || 'series'}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 18 }}>
            <span style={{ color: COLORS.gray, fontWeight: 800 }}>{p.name || p.dataKey}</span>
            <span style={{ fontWeight: 950 }}>{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminReports = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [a, d] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/admin/destinations').catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        setAnalytics(a.data);
        setDestinations(d.data || []);
      } catch (e) {
        if (mounted) {
          setAnalytics(null);
          setDestinations([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const destinationNameById = useMemo(() => {
    const map = new Map();
    destinations.forEach((d) => map.set(String(d._id), d.name));
    return map;
  }, [destinations]);

  const kpis = useMemo(() => {
    const usersTotal = analytics?.users?.total ?? 0;
    const usersActive = analytics?.users?.active ?? 0;
    const usersInactive = Math.max(0, usersTotal - usersActive);
    const budgetsTotal = analytics?.budgets?.total ?? 0;
    const destinationsTotal = analytics?.destinations?.total ?? 0;
    const destinationsPopular = analytics?.destinations?.popular ?? 0;
    const conversationsTotal = analytics?.conversations?.total ?? 0;

    const trends = analytics?.budgetTrends || [];
    const revenue = trends.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
    const trendDelta = trends.length >= 2
      ? (Number(trends[trends.length - 1]?.totalAmount || 0) - Number(trends[trends.length - 2]?.totalAmount || 0))
      : 0;

    return {
      usersTotal,
      usersActive,
      usersInactive,
      budgetsTotal,
      destinationsTotal,
      destinationsPopular,
      conversationsTotal,
      revenue,
      trendDelta,
    };
  }, [analytics]);

  const budgetTrendData = useMemo(() => {
    const trends = analytics?.budgetTrends || [];
    return trends.map((t) => ({
      month: t._id,
      totalAmount: Number(t.totalAmount) || 0,
      bookings: Number(t.count) || 0,
    }));
  }, [analytics]);

  const topDestinations = useMemo(() => {
    const items = analytics?.topDestinations || [];
    return items.map((d) => {
      const id = d._id ? String(d._id) : '';
      return {
        id,
        name: destinationNameById.get(id) || id || 'Unknown',
        count: Number(d.count) || 0,
      };
    });
  }, [analytics, destinationNameById]);

  const audienceSplit = useMemo(() => {
    const activeCount = Number(kpis.usersActive) || 0;
    const inactiveCount = Number(kpis.usersInactive) || 0;
    const total = Math.max(1, activeCount + inactiveCount);
    return [
      { name: 'Active', value: activeCount, pct: Math.round((activeCount / total) * 100) },
      { name: 'Inactive', value: inactiveCount, pct: Math.round((inactiveCount / total) * 100) },
    ];
  }, [kpis.usersActive, kpis.usersInactive]);

  const contentSplit = useMemo(() => {
    const total = Number(kpis.destinationsTotal) || 0;
    const featured = Number(kpis.destinationsPopular) || 0;
    const regular = Math.max(0, total - featured);
    const denom = Math.max(1, total);
    return [
      { name: 'Featured', value: featured, pct: Math.round((featured / denom) * 100) },
      { name: 'Standard', value: regular, pct: Math.round((regular / denom) * 100) },
    ];
  }, [kpis.destinationsTotal, kpis.destinationsPopular]);

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h2>Reports</h2>
          <p className="ad-page-subtitle">Analytics, trends, and executive-grade insights.</p>
        </div>
      </div>

      {loading ? (
        <div className="ad-card ad-card-pad">
          <div style={{ padding: 18, fontWeight: 700, color: 'var(--ad-muted)' }}>Loading analytics...</div>
        </div>
      ) : !analytics ? (
        <div className="ad-card ad-card-pad">
          <div style={{ padding: 18, fontWeight: 800, color: 'var(--ad-muted)' }}>No analytics available.</div>
        </div>
      ) : (
        <>
          <div className="ad-grid-4">
            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--ad-muted)' }}>Total Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: 'var(--ad-primary)' }}>{formatMoney(kpis.revenue)}</div>
                </div>
                <div className="ad-stat-icon" style={{ background: 'rgba(212,163,115,0.16)' }}>
                  <BadgeDollarSign size={18} />
                </div>
              </div>
              <div style={{ marginTop: 10, color: 'var(--ad-muted)', fontWeight: 800, fontSize: 12 }}>
                Trend delta: {kpis.trendDelta >= 0 ? '+' : ''}{formatMoney(kpis.trendDelta)}
              </div>
            </div>

            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--ad-muted)' }}>Bookings</div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: 'var(--ad-primary)' }}>{kpis.budgetsTotal}</div>
                </div>
                <div className="ad-stat-icon" style={{ background: 'rgba(58,134,255,0.14)' }}>
                  <BarChart3 size={18} />
                </div>
              </div>
              <div style={{ marginTop: 10, color: 'var(--ad-muted)', fontWeight: 800, fontSize: 12 }}>
                Monthly points: {budgetTrendData.length}
              </div>
            </div>

            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--ad-muted)' }}>Users</div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: 'var(--ad-primary)' }}>{kpis.usersTotal}</div>
                </div>
                <div className="ad-stat-icon" style={{ background: 'rgba(45,106,79,0.14)' }}>
                  <Users size={18} />
                </div>
              </div>
              <div style={{ marginTop: 10, color: 'var(--ad-muted)', fontWeight: 800, fontSize: 12 }}>
                Active: {kpis.usersActive}
              </div>
            </div>

            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--ad-muted)' }}>Conversations</div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: 'var(--ad-primary)' }}>{kpis.conversationsTotal}</div>
                </div>
                <div className="ad-stat-icon" style={{ background: 'rgba(124,58,237,0.12)' }}>
                  <MessageSquare size={18} />
                </div>
              </div>
              <div style={{ marginTop: 10, color: 'var(--ad-muted)', fontWeight: 800, fontSize: 12 }}>
                Support + BuddyBot load
              </div>
            </div>
          </div>

          <div className="ad-grid-2" style={{ marginTop: 16 }}>
            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>Revenue Trend</div>
                  <div style={{ color: 'var(--ad-muted)', fontWeight: 700, fontSize: 12 }}>Sum of travel fund totals per month</div>
                </div>
                <span className="ad-badge gold">PKR</span>
              </div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={budgetTrendData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={COLORS.grid} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: COLORS.gray, fontSize: 12, fontWeight: 800 }} />
                    <YAxis tick={{ fill: COLORS.gray, fontSize: 12, fontWeight: 800 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" name="Revenue" dataKey="totalAmount" stroke={COLORS.accent} fill="url(#revFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>Bookings Trend</div>
                  <div style={{ color: 'var(--ad-muted)', fontWeight: 700, fontSize: 12 }}>Count of budgets created per month</div>
                </div>
                <span className="ad-badge">Monthly</span>
              </div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={budgetTrendData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={COLORS.grid} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: COLORS.gray, fontSize: 12, fontWeight: 800 }} />
                    <YAxis tick={{ fill: COLORS.gray, fontSize: 12, fontWeight: 800 }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" name="Bookings" dataKey="bookings" stroke={COLORS.sky} strokeWidth={2.2} dot={{ r: 2.6, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="ad-grid-2" style={{ marginTop: 16 }}>
            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>Top Destinations</div>
                  <div style={{ color: 'var(--ad-muted)', fontWeight: 700, fontSize: 12 }}>Most booked destinations</div>
                </div>
                <div className="ad-stat-icon" style={{ width: 42, height: 42, borderRadius: 16, background: 'rgba(27,67,50,0.10)' }}>
                  <MapPinned size={18} />
                </div>
              </div>

              {topDestinations.length ? (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={topDestinations} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: COLORS.gray, fontSize: 11, fontWeight: 800 }} interval={0} height={60} angle={-12} />
                      <YAxis tick={{ fill: COLORS.gray, fontSize: 12, fontWeight: 800 }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar name="Bookings" dataKey="count" fill={COLORS.teal} radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: 18, fontWeight: 800, color: 'var(--ad-muted)' }}>No destination booking data yet.</div>
              )}

              {topDestinations.length ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                  {topDestinations.map((d) => (
                    <div key={d.id || d.name} className="ad-card" style={{ padding: 12, borderRadius: 18, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>{d.name}</div>
                      <span className="ad-badge gold">{d.count}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="ad-card ad-card-pad">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>Audience & Content Mix</div>
                  <div style={{ color: 'var(--ad-muted)', fontWeight: 700, fontSize: 12 }}>Operational health snapshots</div>
                </div>
                <span className="ad-badge">Insights</span>
              </div>

              <div className="ad-grid-2" style={{ gap: 12 }}>
                <div className="ad-card" style={{ padding: 12, borderRadius: 18, background: COLORS.surface }}>
                  <div style={{ fontWeight: 950, color: 'var(--ad-primary)', marginBottom: 8 }}>User Status</div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend verticalAlign="bottom" height={28} />
                        <Pie data={audienceSplit} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={3}>
                          {audienceSplit.map((entry) => (
                            <Cell key={entry.name} fill={entry.name === 'Active' ? COLORS.teal : COLORS.coral} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {audienceSplit.map((s) => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontWeight: 900 }}>
                        <span style={{ color: 'var(--ad-muted)' }}>{s.name}</span>
                        <span>{s.value} ({clamp(s.pct, 0, 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ad-card" style={{ padding: 12, borderRadius: 18, background: COLORS.surface }}>
                  <div style={{ fontWeight: 950, color: 'var(--ad-primary)', marginBottom: 8 }}>Destinations</div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend verticalAlign="bottom" height={28} />
                        <Pie data={contentSplit} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={3}>
                          {contentSplit.map((entry) => (
                            <Cell key={entry.name} fill={entry.name === 'Featured' ? COLORS.accent : COLORS.sky} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {contentSplit.map((s) => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontWeight: 900 }}>
                        <span style={{ color: 'var(--ad-muted)' }}>{s.name}</span>
                        <span>{s.value} ({clamp(s.pct, 0, 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 950, color: 'var(--ad-primary)', marginBottom: 8 }}>Highlights</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div className="ad-card" style={{ padding: 12, borderRadius: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div style={{ fontWeight: 900 }}>Featured destination ratio</div>
                      <span className="ad-badge gold">{contentSplit[0]?.pct ?? 0}%</span>
                    </div>
                    <div style={{ marginTop: 10, height: 10, background: COLORS.grid, borderRadius: 999 }}>
                      <div
                        style={{
                          width: `${clamp(contentSplit[0]?.pct ?? 0, 0, 100)}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, var(--ad-primary), var(--ad-accent))',
                        }}
                      />
                    </div>
                  </div>

                  <div className="ad-card" style={{ padding: 12, borderRadius: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div style={{ fontWeight: 900 }}>Active user ratio</div>
                      <span className="ad-badge">{audienceSplit[0]?.pct ?? 0}%</span>
                    </div>
                    <div style={{ marginTop: 10, height: 10, background: COLORS.grid, borderRadius: 999 }}>
                      <div
                        style={{
                          width: `${clamp(audienceSplit[0]?.pct ?? 0, 0, 100)}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: `linear-gradient(90deg, ${COLORS.teal}, ${COLORS.sky})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ad-card ad-card-pad" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>KPI Snapshot</div>
                <div style={{ color: 'var(--ad-muted)', fontWeight: 700, fontSize: 12 }}>Relative size across key modules</div>
              </div>
              <span className="ad-badge gold">Distribution</span>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart
                  data={[
                    { name: 'Users', value: kpis.usersTotal },
                    { name: 'Active Users', value: kpis.usersActive },
                    { name: 'Bookings', value: kpis.budgetsTotal },
                    { name: 'Destinations', value: kpis.destinationsTotal },
                    { name: 'Featured', value: kpis.destinationsPopular },
                    { name: 'Conversations', value: kpis.conversationsTotal },
                  ]}
                  margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: COLORS.gray, fontSize: 12, fontWeight: 800 }} interval={0} height={52} angle={-8} />
                  <YAxis tick={{ fill: COLORS.gray, fontSize: 12, fontWeight: 800 }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar name="Count" dataKey="value" fill={COLORS.primary} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReports;
