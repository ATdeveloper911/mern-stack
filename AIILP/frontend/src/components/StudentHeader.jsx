import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfilePictureUrl } from '../utils/api'

// StudentHeader: profile card header matching the dashboard design.
// Note: not wired into Layout yet per request.
export default function StudentHeader() {
  const { profile } = useAuth()
  const pictureUrl = profile?.profile_picture ? getProfilePictureUrl(profile.profile_picture) : null

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {pictureUrl ? (
            <div className="relative">
            <img
              src={pictureUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  // Hide broken image and show fallback
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-2 border-gray-200 hidden">
                <span className="text-2xl font-bold text-blue-600">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {profile?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{profile?.full_name || 'Student'}</h2>
            <p className="text-gray-600">{profile?.email || ''}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            to="/cv"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Edit Profile
          </Link>
          <Link
            to="/cv"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Upload CV
          </Link>
        </div>
      </div>
    </div>
  )
}