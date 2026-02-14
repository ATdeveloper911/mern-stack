import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';

const maskKey = (value) => {
  if (!value) return '—';
  const str = String(value);
  if (str.length <= 8) return '••••••••';
  return `${str.slice(0, 4)}••••••••${str.slice(-4)}`;
};

const AdminSettings = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', apiKey: '', service: 'Google Maps', description: '' });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/api-keys').catch(() => ({ data: [] }));
      setApiKeys(res.data || []);
    } catch (e) {
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(form.name.trim() && form.apiKey.trim());
  }, [form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await api.post('/admin/api-keys', {
        name: form.name.trim(),
        apiKey: form.apiKey.trim(),
        service: form.service,
        description: form.description,
      });
      setForm({ name: '', apiKey: '', service: 'Google Maps', description: '' });
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save API key.');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this API key?')) return;
    try {
      await api.delete(`/admin/api-keys/${id}`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete API key.');
    }
  };

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h2>Settings</h2>
          <p className="ad-page-subtitle">System configuration and integrations.</p>
        </div>
      </div>

      <div className="ad-grid-2">
        <div className="ad-card ad-card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div className="ad-stat-icon" aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 18 }}>
              <KeyRound size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>API Keys</div>
              <div style={{ color: 'var(--ad-muted)', fontWeight: 600, fontSize: 13 }}>Store service keys securely (masked in UI).</div>
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
            <input
              className="ad-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name (e.g. Google Maps)"
            />
            <input
              className="ad-input"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="API Key"
            />
            <input
              className="ad-input"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              placeholder="Service"
            />
            <input
              className="ad-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
            />
            <button type="submit" className="ad-btn ad-btn-primary" disabled={!canSubmit}>
              <Plus size={18} />
              Add Key
            </button>
          </form>
        </div>

        <div className="ad-card ad-card-pad">
          <div style={{ fontWeight: 950, color: 'var(--ad-primary)', marginBottom: 10 }}>Stored Keys</div>

          {loading ? (
            <div style={{ padding: 10, fontWeight: 700, color: 'var(--ad-muted)' }}>Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div style={{ padding: 10, fontWeight: 700, color: 'var(--ad-muted)' }}>No keys configured.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Key</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k._id}>
                      <td style={{ fontWeight: 900 }}>{k.name}</td>
                      <td>{k.service || '—'}</td>
                      <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: 12 }}>
                        {maskKey(k.apiKey)}
                      </td>
                      <td>
                        <div className="ad-actions">
                          <button type="button" className="ad-icon-btn" onClick={() => onDelete(k._id)}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
