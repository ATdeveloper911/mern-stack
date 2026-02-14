import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ allowed }) {
  const { user, profile, loading, initialized } = useAuth()

  // Wait for auth initialization
  if (loading || !initialized) return <div className="p-6">Restoring session...</div>

  // If there is no authenticated user, redirect to login
  if (!user) return <Navigate to="/login" replace />

  // If profile hasn't loaded yet, wait without redirecting
  if (!profile) return <div className="p-6">Loading profile...</div>

  // Enforce role access
  if (!allowed.includes(profile.role)) return <Navigate to="/" replace />

  return <Outlet />
}