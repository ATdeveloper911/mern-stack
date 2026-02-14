import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Edit3, Plus, Search, Shield, ToggleLeft, ToggleRight, X } from 'lucide-react';
import api from '../../utils/api';

const statusBadge = (user) => {
  const isActive = user?.isActive !== false && user?.status !== 'banned';
  return (
    <span className={`ad-badge ${isActive ? 'green' : 'red'}`}>
      {isActive ? 'Active' : 'Banned'}
    </span>
  );
};

const AdminUsers = () => {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    contactNumber: '',
    password: '',
    role: 'user',
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (e) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || '');
  }, [location.search]);

  const openAdd = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', contactNumber: '', password: '', role: 'user', isActive: true });
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      contactNumber: u.contactNumber || '',
      password: '',
      role: u.role || 'user',
      isActive: u.isActive !== false,
    });
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingUser(null);
    setError('');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [users, query]);

  const toggleStatus = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle`);
      await load();
    } catch (e) {
      // ignore
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!form.name.trim() || !form.email.trim() || !form.contactNumber.trim()) {
        throw new Error('Name, Email and Contact Number are required.');
      }

      if (!editingUser && !form.password.trim()) {
        throw new Error('Password is required for new users.');
      }

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        role: form.role,
        isActive: !!form.isActive,
      };

      if (form.password.trim()) payload.password = form.password;

      if (editingUser?._id) {
        await api.put(`/admin/users/${editingUser._id}`, payload);
      } else {
        await api.post('/admin/users', payload);
      }

      await load();
      setIsModalOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h2>Users</h2>
          <p className="ad-page-subtitle">Manage roles, access, and account status.</p>
        </div>
      </div>

      <div className="ad-card ad-card-pad">
        <div className="ad-toolbar">
          <div style={{ position: 'relative', width: 'min(420px, 100%)' }}>
            <input
              className="ad-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
            />
            <Search
              size={18}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ad-muted)',
              }}
            />
          </div>

          <button type="button" className="ad-btn ad-btn-primary" onClick={openAdd}>
            <Plus size={18} />
            Add New User
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="ad-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 18, color: 'var(--ad-muted)', fontWeight: 700 }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 18, color: 'var(--ad-muted)', fontWeight: 700 }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const name = u.name || 'User';
                  const initial = name.charAt(0).toUpperCase();
                  const role = u.role || 'user';

                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="ad-row-title">
                          <div className="ad-row-avatar" aria-hidden="true">{initial}</div>
                          {name}
                        </div>
                      </td>
                      <td>{u.email || '—'}</td>
                      <td>
                        <span className={`ad-badge ${role === 'admin' ? 'gold' : ''}`}>
                          <Shield size={14} style={{ marginRight: 6 }} />
                          {role}
                        </span>
                      </td>
                      <td>{statusBadge(u)}</td>
                      <td>
                        <div className="ad-actions">
                          <button
                            type="button"
                            className="ad-icon-btn"
                            onClick={() => openEdit(u)}
                            title="Edit"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            type="button"
                            className="ad-icon-btn"
                            onClick={() => toggleStatus(u._id)}
                            title="Toggle Active/Banned"
                          >
                            {(u?.isActive !== false && u?.status !== 'banned') ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <div className="ad-modal-overlay" onClick={closeModal}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-header">
              <h3 className="ad-modal-title">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button type="button" className="ad-icon-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveUser}>
              <div className="ad-modal-body">
                <div className="ad-form-grid">
                  <div className="ad-field">
                    <label>Name</label>
                    <input className="ad-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="ad-field">
                    <label>Email</label>
                    <input className="ad-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>

                  <div className="ad-field">
                    <label>Contact Number</label>
                    <input
                      className="ad-input"
                      value={form.contactNumber}
                      onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                    />
                  </div>

                  <div className="ad-field">
                    <label>Password {editingUser ? '(optional)' : ''}</label>
                    <input
                      className="ad-input"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingUser ? 'Leave blank to keep current password' : 'Set a password'}
                    />
                  </div>

                  <div className="ad-field">
                    <label>Role</label>
                    <select className="ad-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <div className="ad-field">
                    <label>Status</label>
                    <select
                      className="ad-select"
                      value={form.isActive ? 'active' : 'banned'}
                      onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
                    >
                      <option value="active">Active</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>
                </div>

                {error ? <div className="ad-badge red" style={{ marginTop: 12 }}>{error}</div> : null}
              </div>

              <div className="ad-modal-footer">
                <button type="button" className="ad-btn" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminUsers;
