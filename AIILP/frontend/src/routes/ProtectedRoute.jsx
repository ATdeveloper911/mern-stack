import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading, initialized } = useAuth()
  if (loading || !initialized) return <div className="p-6">Restoring session...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}