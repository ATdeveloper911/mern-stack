import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, KeyRound, Save, ShieldCheck, User } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosConfig';
import './Profile.css';

const apiOriginFromBaseUrl = (baseUrl) => {
  if (!baseUrl) return 'http://localhost:5000';
  return baseUrl.replace(/\/+$/, '').replace(/\/api\/?$/, '');
};

const Profile = () => {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const apiOrigin = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    return apiOriginFromBaseUrl(base);
  }, []);

  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [identityMessage, setIdentityMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const profilePictureUrl = user?.profilePicture ? `${apiOrigin}${user.profilePicture}` : '';
  const effectivePreview = previewUrl || profilePictureUrl;

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIdentityMessage('');
    setErrorMessage('');

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const saveIdentity = async (e) => {
    e.preventDefault();
    setSavingIdentity(true);
    setIdentityMessage('');
    setErrorMessage('');

    try {
      const formData = new FormData();
      if (name?.trim()) formData.append('name', name.trim());
      if (selectedFile) formData.append('profilePicture', selectedFile);

      await axiosInstance.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      await fetchProfile();
      setSelectedFile(null);
      setPreviewUrl('');
      setIdentityMessage('Profile updated successfully.');
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingIdentity(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage('');
    setErrorMessage('');

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
      setPasswordMessage('Password updated successfully.');
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="stp-profile-page">
      {/* Background is handled in CSS now to be bright */}
      
      <main className="stp-profile-shell">
        <motion.div
          className="stp-profile-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Header Section */}
          <div className="stp-profile-header">
            <button
              type="button"
              className="stp-profile-back"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <h1 className="stp-profile-title">Account Settings</h1>
            <p className="stp-profile-subtitle">Manage your profile details and security.</p>
          </div>

          <div className="stp-profile-content">
            {/* Left Column: Avatar */}
            <div className="stp-profile-card stp-profile-sidebar">
              <div className="stp-avatar-wrapper">
                {effectivePreview ? (
                  <img className="stp-avatar-img" src={effectivePreview} alt="Profile" />
                ) : (
                  <div className="stp-avatar-fallback">
                    <User size={64} strokeWidth={1.5} />
                  </div>
                )}
                <button type="button" className="stp-camera-btn" onClick={onPickFile}>
                  <Camera size={20} />
                </button>
              </div>
              
              <div className="stp-sidebar-info">
                <h2 className="stp-sidebar-name">{user?.name || 'Traveler'}</h2>
                <p className="stp-sidebar-role">{user?.role === 'admin' ? 'Administrator' : 'Explorer'}</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="stp-hidden-file"
                onChange={onFileChange}
              />
            </div>

            {/* Right Column: Forms */}
            <div className="stp-profile-main">
              {/* Identity Form */}
              <div className="stp-profile-card stp-form-section">
                <div className="stp-section-header">
                  <div className="stp-section-icon icon-blue">
                    <ShieldCheck size={20} />
                  </div>
                  <h3>Personal Information</h3>
                </div>
                
                <form className="stp-form-grid" onSubmit={saveIdentity}>
                  <label className="stp-label">
                    Full Name
                    <input
                      className="stp-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </label>

                  <div className="stp-form-actions">
                    <button className="stp-btn-primary" type="submit" disabled={savingIdentity}>
                      <Save size={18} />
                      {savingIdentity ? 'Saving...' : 'Save Changes'}
                    </button>
                    {identityMessage && <span className="stp-msg-success">{identityMessage}</span>}
                  </div>
                </form>
              </div>

              {/* Security Form */}
              <div className="stp-profile-card stp-form-section">
                <div className="stp-section-header">
                  <div className="stp-section-icon icon-gold">
                    <KeyRound size={20} />
                  </div>
                  <h3>Security</h3>
                </div>

                <form className="stp-form-stack" onSubmit={savePassword}>
                  <label className="stp-label">
                    Current Password
                    <input
                      className="stp-input"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </label>

                  <div className="stp-row-2">
                    <label className="stp-label">
                      New Password
                      <input
                        className="stp-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </label>

                    <label className="stp-label">
                      Confirm Password
                      <input
                        className="stp-input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </label>
                  </div>

                  <div className="stp-form-actions">
                    <button className="stp-btn-primary" type="submit" disabled={savingPassword}>
                      <Save size={18} />
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                    {passwordMessage && <span className="stp-msg-success">{passwordMessage}</span>}
                  </div>
                  
                  {errorMessage && <div className="stp-msg-error">{errorMessage}</div>}
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;