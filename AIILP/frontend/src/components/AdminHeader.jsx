import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfilePictureUrl, getDefaultProfilePictureUrl } from '../utils/api'
import { useNotifications } from '../hooks/useNotifications'
import { supabase } from '../utils/supabase'
import { useQuery } from '@tanstack/react-query'
import ProfilePictureModal from './ProfilePictureModal'

export default function AdminHeader() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const email = user?.email || 'admin@aiilp.com'
  const pictureUrl = profile?.profile_picture ? getProfilePictureUrl(profile.profile_picture) : null
  const [showModal, setShowModal] = useState(false)
  const userName = profile?.full_name || profile?.organization_name || 'Admin'
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef(null)
  const resultsRef = useRef(null)
  const { unreadCount } = useNotifications()

  // Fetch search results
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['admin-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { users: [], internships: [], applications: [] }
      
      const query = searchQuery.trim().toLowerCase()
      const results = { users: [], internships: [], applications: [] }

      try {
        // Search users/profiles
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, organization_name, email, role')
          .or(`full_name.ilike.%${query}%,organization_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5)

        if (users) results.users = users

        // Search internships
        const { data: internships } = await supabase
          .from('internships')
          .select('id, title, description, status')
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5)

        if (internships) results.internships = internships

        // Search applications (with user and internship info)
        const { data: applications } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            profiles:user_id(full_name, email),
            internships:internship_id(title)
          `)
          .limit(10)

        if (applications) {
          results.applications = applications.filter(app => {
            const userName = app.profiles?.full_name || app.profiles?.email || ''
            const internshipTitle = app.internships?.title || ''
            return userName.toLowerCase().includes(query) || internshipTitle.toLowerCase().includes(query)
          }).slice(0, 5)
        }
      } catch (error) {
        console.error('Search error:', error)
      }

      return results
    },
    enabled: searchQuery.trim().length > 0,
    staleTime: 30000,
  })

  const hasResults = useMemo(() => {
    if (!searchResults) return false
    return searchResults.users.length > 0 || searchResults.internships.length > 0 || searchResults.applications.length > 0
  }, [searchResults])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        setShowSearchResults(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    setShowSearchResults(e.target.value.trim().length > 0)
  }

  const handleResultClick = (type, id) => {
    setSearchQuery('')
    setShowSearchResults(false)
    if (type === 'user') {
      navigate(`/admin/users`)
    } else if (type === 'internship') {
      navigate(`/admin/pending-internships`)
    } else if (type === 'application') {
      navigate(`/admin/users`)
    }
  }

  return (
    <header className="bg-gradient-to-b from-indigo-50 via-blue-50 to-indigo-50 border-b border-indigo-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-end gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search users, internships, applications..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-indigo-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            {searching && (
              <svg className="w-4 h-4 text-blue-500 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim().length > 0 && (
            <div 
              ref={resultsRef}
              className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-indigo-100 z-50 max-h-96 overflow-y-auto"
            >
              {searching ? (
                <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
              ) : hasResults ? (
                <div className="p-2">
                  {/* Users */}
                  {searchResults.users.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Users</div>
                      {searchResults.users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleResultClick('user', user.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {(user.full_name || user.organization_name || user.email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {user.full_name || user.organization_name || 'No name'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{user.email}</div>
                            <div className="text-xs text-blue-600">{user.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Internships */}
                  {searchResults.internships.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Internships</div>
                      {searchResults.internships.map((internship) => (
                        <button
                          key={internship.id}
                          onClick={() => handleResultClick('internship', internship.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{internship.title}</div>
                            <div className="text-xs text-gray-500 truncate line-clamp-1">{internship.description}</div>
                            <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                              internship.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              internship.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {internship.status}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Applications */}
                  {searchResults.applications.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applications</div>
                      {searchResults.applications.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => handleResultClick('application', app.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {app.profiles?.full_name || app.profiles?.email || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{app.internships?.title || 'N/A'}</div>
                            <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                              app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                              app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {app.status}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">No results found</div>
              )}
            </div>
          )}
        </div>

        {/* Notification bell with count */}
        <button
          type="button"
          onClick={() => navigate('/admin/notifications')}
          className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-600 hover:bg-indigo-100 transition-colors border border-indigo-200"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        {pictureUrl ? (
          <button
            type="button"
            aria-label="Preview profile picture"
            title={userName}
            onClick={() => setShowModal(true)}
            className="focus:outline-none"
          >
            <img
              src={pictureUrl}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover border-2 border-indigo-200"
              onError={(e) => { e.currentTarget.src = getDefaultProfilePictureUrl() }}
            />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Preview profile picture"
            title={userName}
            onClick={() => setShowModal(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center focus:outline-none"
          >
            <span className="text-sm font-semibold text-white">
              {userName?.[0]?.toUpperCase() || 'A'}
            </span>
          </button>
        )}

        {/* Profile Picture Modal */}
        <ProfilePictureModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          profilePicture={profile?.profile_picture}
          userName={userName}
          userRole={profile?.role || 'admin'}
        />
      </div>
    </header>
  )
}