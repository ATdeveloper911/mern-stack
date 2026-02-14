import React, { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import AdminHeader from './components/AdminHeader'
import SoftwareHouseHeader from './components/SoftwareHouseHeader'
import Sidebar from './components/Sidebar'
import StudentSidebar from './components/StudentSidebar'
import SoftwareHouseSidebar from './components/SoftwareHouseSidebar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import StudentDashboard from './pages/student/Dashboard'
import StudentSettings from './pages/student/Settings'
import StudentAnalytics from './pages/student/Analytics'
import GuestDashboard from './pages/guest/Dashboard'
import UniversityDashboard from './pages/university/Dashboard'
import SoftwareHouseDashboard from './pages/software_house/Dashboard'
import AdminDashboard from './pages/admin/Dashboard'
import UserManagement from './pages/admin/UserManagement'
import Listings from './pages/Listings'
import CVForm from './pages/CVForm'
import Applications from './pages/Applications'
import BulkUpload from './pages/university/BulkUpload'
import StudentApplications from './pages/university/StudentApplications'
import StudentDetail from './pages/university/StudentDetail'
import UniversityAnalytics from './pages/university/Analytics'
import UniversitySettings from './pages/university/Settings'
import Students from './pages/university/Students'
import PostInternship from './pages/software_house/PostInternship'
import MyInternships from './pages/software_house/MyInternships'
import ManageApplications from './pages/software_house/ManageApplications'
import PendingInternships from './pages/admin/PendingInternships'
import PendingAccounts from './pages/admin/PendingAccounts'
import AdminAnalytics from './pages/admin/Analytics'
import AuditLogs from './pages/admin/AuditLogs'
import Settings from './pages/admin/Settings'
import SoftwareHouseSettings from './pages/software_house/Settings'
import SoftwareHouseAnalytics from './pages/software_house/Analytics'
import SoftwareHouseNotifications from './pages/software_house/Notifications'
import AdminNotifications from './pages/admin/Notifications'
import StudentNotifications from './pages/student/Notifications'
import Landing from './pages/Landing'

function Layout({ children }) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const isSoftwareHouse = profile?.role === 'software_house'
  const isStudent = profile?.role === 'student'
  const isGuest = profile?.role === 'guest'
  const hasHeader = isAdmin || (!isSoftwareHouse && !isStudent && !isGuest)
  return (
    <div className="min-h-screen flex">
      {/* Left: Sidebar, pinned to the very top */}
      <div className="w-64 shrink-0 sticky top-0 h-screen">
        {isSoftwareHouse ? <SoftwareHouseSidebar /> : (isStudent || isGuest) ? <StudentSidebar /> : <Sidebar />}
      </div>

      {/* Right: Column with sticky header at top and scrollable content below */}
      <div className="flex-1 flex flex-col">
        {hasHeader && (
          <div className="sticky top-0 z-30">
            {isAdmin ? <AdminHeader /> : <Header />}
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (!profile) return  // wait for profile from AuthContext

    const map = {
      student: '/dashboard/student',
      guest: '/dashboard/guest',
      university: '/dashboard/university',
      software_house: '/dashboard/software-house',
      admin: '/dashboard/admin',
    }
    navigate(map[profile.role] || '/dashboard/student', { replace: true })
  }, [user, profile, loading, navigate])
  return <div className="p-6">Redirecting...</div>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<ProtectedRoute />}> 
          {/* After login, send users here to jump to their role dashboard */}
          <Route path="/dashboard" element={<RootRedirect />} />

          {/* Shared pages for student and guest */}
          <Route path="/cv" element={<Layout><CVForm /></Layout>} />
          <Route path="/applications" element={<Layout><Applications /></Layout>} />
          <Route path="/listings" element={<Layout><Listings /></Layout>} />

          <Route element={<RoleRoute allowed={["student"]} />}>
            <Route path="/dashboard/student" element={<Layout><StudentDashboard /></Layout>} />
            <Route path="/student/analytics" element={<Layout><StudentAnalytics /></Layout>} />
            <Route path="/student/notifications" element={<Layout><StudentNotifications /></Layout>} />
            <Route path="/student/settings" element={<Layout><StudentSettings /></Layout>} />
          </Route>

          <Route element={<RoleRoute allowed={["guest"]} />}>
            <Route path="/dashboard/guest" element={<Layout><GuestDashboard /></Layout>} />
            <Route path="/guest/analytics" element={<Layout><StudentAnalytics /></Layout>} />
            <Route path="/guest/notifications" element={<Layout><StudentNotifications /></Layout>} />
            <Route path="/guest/settings" element={<Layout><StudentSettings /></Layout>} />
          </Route>

          <Route element={<RoleRoute allowed={["university"]} />}>
            <Route path="/dashboard/university" element={<Layout><UniversityDashboard /></Layout>} />
            <Route path="/bulk-upload" element={<Layout><BulkUpload /></Layout>} />
            <Route path="/university/students" element={<Layout><Students /></Layout>} />
            <Route path="/university/applications" element={<Layout><StudentApplications /></Layout>} />
            <Route
              path="/university/students/:userId"
              element={
                <Layout>
                  <React.Suspense fallback={<div className="p-6">Loading...</div>}>
                    <StudentDetail />
                  </React.Suspense>
                </Layout>
              }
            />
            <Route path="/university/analytics" element={<Layout><UniversityAnalytics /></Layout>} />
            <Route path="/university/settings" element={<Layout><UniversitySettings /></Layout>} />
          </Route>

          <Route element={<RoleRoute allowed={["software_house"]} />}>
            <Route path="/dashboard/software-house" element={<Layout><SoftwareHouseDashboard /></Layout>} />
            <Route path="/internships/new" element={<Layout><PostInternship /></Layout>} />
            <Route path="/internships/my" element={<Layout><MyInternships /></Layout>} />
            <Route path="/applications/manage" element={<Layout><ManageApplications /></Layout>} />
            <Route path="/software-house/analytics" element={<Layout><SoftwareHouseAnalytics /></Layout>} />
            <Route path="/software-house/notifications" element={<Layout><SoftwareHouseNotifications /></Layout>} />
            <Route path="/software-house/settings" element={<Layout><SoftwareHouseSettings /></Layout>} />
          </Route>

          <Route element={<RoleRoute allowed={["admin"]} />}>
            <Route path="/dashboard/admin" element={<Layout><AdminDashboard /></Layout>} />
            <Route path="/admin/pending-internships" element={<Layout><PendingInternships /></Layout>} />
            <Route path="/admin/pending-accounts" element={<Layout><PendingAccounts /></Layout>} />
            <Route path="/admin/users" element={<Layout><UserManagement /></Layout>} />
            <Route path="/admin/logs" element={<Layout><AuditLogs /></Layout>} />
            <Route path="/admin/notifications" element={<Layout><AdminNotifications /></Layout>} />
            <Route path="/admin/analytics" element={<Layout><AdminAnalytics /></Layout>} />
            <Route path="/admin/settings" element={<Layout><Settings /></Layout>} />
          </Route>

          <Route path="/listings" element={<Layout><Listings /></Layout>} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}