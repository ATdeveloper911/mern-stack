import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfilePictureUrl } from '../utils/api'
import ProfilePictureModal from './ProfilePictureModal'
import logo from '../logos/logo.jpeg'

export default function SoftwareHouseSidebar() {
  const { user, profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const [showModal, setShowModal] = useState(false)

  const links = [
    { to: '/dashboard/software-house', label: 'Dashboard', icon: 'dashboard' },
    { to: '/internships/new', label: 'Postings', icon: 'postings' },
    { to: '/internships/my', label: 'My Internships', icon: 'internships' },
    { to: '/applications/manage', label: 'Applicants', icon: 'applicants' },
    { to: '/software-house/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/software-house/analytics', label: 'Analytics', icon: 'analytics' },
    { to: '/software-house/settings', label: 'Settings', icon: 'settings' },
  ]

  const isActive = (to) => pathname === to || pathname.startsWith(to + '/')

  const NavIcon = ({ name, active }) => {
    const color = active ? 'text-blue-600' : 'text-gray-400'
    switch (name) {
      case 'dashboard':
        return (
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="8" height="8" rx="2" strokeWidth="2" />
            <rect x="13" y="3" width="8" height="8" rx="2" strokeWidth="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" strokeWidth="2" />
            <rect x="13" y="13" width="8" height="8" rx="2" strokeWidth="2" />
          </svg>
        )
      case 'postings':
        return (
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )
      case 'applicants':
        return (
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
          </svg>
        )
      case 'analytics':
        return (
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="12" width="3" height="8" rx="1" strokeWidth="2" />
            <rect x="10.5" y="8" width="3" height="12" rx="1" strokeWidth="2" />
            <rect x="17" y="4" width="3" height="16" rx="1" strokeWidth="2" />
          </svg>
        )
      case 'internships':
        return (
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      case 'notifications':
        return (
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
      case 'settings':
        return (
          <svg className={`w-5 h-5 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1 1 0 011.35-.436l1.932.966a1 1 0 00.894 0l1.932-.966a1 1 0 011.35.436l1.12 1.94a1 1 0 00.223.26l1.694 1.273a1 1 0 01.364 1.093l-.567 2.138a1 1 0 000 .516l.567 2.138a1 1 0 01-.364 1.093l-1.694 1.273a1 1 0 00-.223.26l-1.12 1.94a1 1 0 01-1.35.436l-1.932-.966a1 1 0 00-.894 0l-1.932.966a1 1 0 01-1.35-.436l-1.12-1.94a1 1 0 00-.223-.26l-1.694-1.273a1 1 0 01-.364-1.093l.567-2.138a1 1 0 000-.516l-.567-2.138a1 1 0 01.364-1.093l1.694-1.273a1 1 0 00.223-.26l1.12-1.94z" />
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
          </svg>
        )
      default:
        return null
    }
  }

  const renderLink = (link) => {
    const active = isActive(link.to)
    return (
      <Link
        key={link.to}
        to={link.to}
        className={`flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          active ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className={active ? 'text-blue-600' : 'text-gray-500'}>
          <NavIcon name={link.icon} active={active} />
        </span>
        <span>{link.label}</span>
      </Link>
    )
  }

  const initials = (user?.email || 'S')[0]?.toUpperCase()
  const email = user?.email || 'software@aiilp.com'
  const pictureUrl = profile?.profile_picture ? getProfilePictureUrl(profile.profile_picture) : null
  const userName = profile?.organization_name || profile?.full_name || null

  return (
    <>
      <aside className="w-64 bg-gradient-to-b from-indigo-50 via-blue-50 to-indigo-50 border-r border-indigo-100 shadow-sm h-full flex flex-col justify-between">
        {/* Brand */}
        <div className="px-5 pt-6 pb-4 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <img src={logo} alt="AIILP logo" className="w-9 h-9 rounded-lg object-cover shadow-sm ring-1 ring-blue-200" />
            <div>
              <div className="text-base font-semibold text-blue-600">AIILP</div>
              <div className="text-xs text-gray-600">Software House</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {links.map(renderLink)}
          </nav>
        </div>

        {/* Bottom profile + actions */}
        <div className="border-t border-indigo-100 px-5 py-4 bg-white/40 backdrop-blur-sm">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity p-2 rounded-lg hover:bg-white/60"
          >
            {pictureUrl ? (
              <div className="relative">
                <img 
                  src={pictureUrl} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                  onError={(e) => {
                    // Hide broken image and show fallback
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.nextElementSibling
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-2 border-blue-200 shadow-sm hidden">
                  <span className="text-sm font-semibold text-white">{initials}</span>
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-2 border-blue-200 shadow-sm">
                <span className="text-sm font-semibold text-white">{initials}</span>
              </div>
            )}
            <div className="flex flex-col text-left flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{userName || 'Software House'}</span>
              <span className="text-xs text-gray-600 truncate">{profile?.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace('_', ' ')) : 'Software House'}</span>
            </div>
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <ProfilePictureModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        profilePicture={profile?.profile_picture}
        userName={userName}
        userRole={profile?.role || ''}
      />
    </>
  )
}