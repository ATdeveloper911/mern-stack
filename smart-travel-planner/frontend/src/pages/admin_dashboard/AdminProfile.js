import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, KeyRound, Save, ShieldCheck, User } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosConfig';

const apiOriginFromBaseUrl = (baseUrl) => {
  if (!baseUrl) return 'http://localhost:5000';
  return baseUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');
};

const AdminProfile = () => {
  const { user, fetchProfile } = useAuth();

  const apiOrigin = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    return apiOriginFromBaseUrl(base);
  }, []);

  const fileInputRef = useRef(null);

  const [tab, setTab] = useState('profile');

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const role = user?.role || 'admin';

  const profilePictureUrl = user?.profilePicture ? `${apiOrigin}${user.profilePicture}` : '';
  const effectivePreview = previewUrl || profilePictureUrl;

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSuccess('');
    setError('');
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const saveIdentity = async (e) => {
    e.preventDefault();
    setSavingIdentity(true);
    setSuccess('');
    setError('');

    try {
      const formData = new FormData();
      if (name?.trim()) formData.append('name', name.trim());
      if (phone?.trim()) formData.append('phone', phone.trim());
      if (selectedFile) formData.append('profilePicture', selectedFile);

      await axiosInstance.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchProfile();
      setSelectedFile(null);
      setPreviewUrl('');
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingIdentity(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setSuccess('');
    setError('');

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Please fill all password fields.');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirm password do not match.');
      }

      await axiosInstance.put('/auth/update-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h2>Admin Profile</h2>
          <p className="ad-page-subtitle">Personal settings and security controls.</p>
        </div>
      </div>

      <div className="ad-card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            height: 160,
            background:
              'linear-gradient(135deg, rgba(26,60,52,0.95), rgba(212,163,115,0.35))',
          }}
        />

        <div style={{ padding: 18, marginTop: -62 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 999,
                  border: '4px solid #fff',
                  boxShadow: '0 18px 40px rgba(15,23,42,0.18)',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.75)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {effectivePreview ? (
                  <img
                    src={effectivePreview}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={56} strokeWidth={1.5} color="var(--ad-primary)" />
                )}
              </div>

              <button
                type="button"
                onClick={onPickFile}
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: 8,
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  border: '1px solid rgba(15,23,42,0.08)',
                  background: 'rgba(255,255,255,0.95)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Camera size={18} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={onFileChange}
              />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 950, fontSize: 18, color: 'var(--ad-primary)' }}>{user?.name || 'Administrator'}</div>
              <div style={{ color: 'var(--ad-muted)', fontWeight: 700, marginTop: 4 }}>{user?.email}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="ad-badge gold">Role: {role}</span>
                <span className="ad-badge">Console Access</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`ad-btn ${tab === 'profile' ? 'ad-btn-primary' : ''}`}
                onClick={() => setTab('profile')}
              >
                Profile
              </button>
              <button
                type="button"
                className={`ad-btn ${tab === 'security' ? 'ad-btn-primary' : ''}`}
                onClick={() => setTab('security')}
              >
                Security
              </button>
            </div>
          </div>

          <div style={{ height: 16 }} />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'profile' ? (
              <div className="ad-card ad-card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="ad-stat-icon" aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 18 }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>Personal Information</div>
                    <div style={{ color: 'var(--ad-muted)', fontWeight: 600, fontSize: 13 }}>Update identity fields.</div>
                  </div>
                </div>

                <form onSubmit={saveIdentity} style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6, fontWeight: 800, fontSize: 12, color: 'var(--ad-muted)' }}>
                    Name
                    <input className="ad-input" value={name} onChange={(e) => setName(e.target.value)} />
                  </label>

                  <label style={{ display: 'grid', gap: 6, fontWeight: 800, fontSize: 12, color: 'var(--ad-muted)' }}>
                    Email (read-only)
                    <input className="ad-input" value={email} readOnly />
                  </label>

                  <label style={{ display: 'grid', gap: 6, fontWeight: 800, fontSize: 12, color: 'var(--ad-muted)' }}>
                    Phone
                    <input className="ad-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
                  </label>

                  <label style={{ display: 'grid', gap: 6, fontWeight: 800, fontSize: 12, color: 'var(--ad-muted)' }}>
                    Role (read-only)
                    <input className="ad-input" value={role} readOnly />
                  </label>

                  <button className="ad-btn ad-btn-primary" type="submit" disabled={savingIdentity}>
                    <Save size={18} />
                    {savingIdentity ? 'Saving...' : 'Save Changes'}
                  </button>

                  {success ? <div className="ad-badge green">{success}</div> : null}
                  {error ? <div className="ad-badge red">{error}</div> : null}
                </form>
              </div>
            ) : (
              <div className="ad-card ad-card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="ad-stat-icon" aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 18 }}>
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 950, color: 'var(--ad-primary)' }}>Security</div>
                    <div style={{ color: 'var(--ad-muted)', fontWeight: 600, fontSize: 13 }}>Change your password.</div>
                  </div>
                </div>

                <form onSubmit={savePassword} style={{ display: 'grid', gap: 12 }}>
                  <input
                    className="ad-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                  />
                  <input
                    className="ad-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <input
                    className="ad-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                  />

                  <button className="ad-btn ad-btn-primary" type="submit" disabled={savingPassword}>
                    <Save size={18} />
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>

                  {success ? <div className="ad-badge green">{success}</div> : null}
                  {error ? <div className="ad-badge red">{error}</div> : null}
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
