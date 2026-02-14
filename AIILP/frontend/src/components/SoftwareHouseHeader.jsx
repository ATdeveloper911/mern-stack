import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfilePictureUrl } from '../utils/api'

export default function SoftwareHouseHeader() {
  const { user, profile } = useAuth()
  const email = user?.email || 'software@aiilp.com'
  const pictureUrl = profile?.profile_picture ? getProfilePictureUrl(profile.profile_picture) : null

  return (
    <header className="bg-[#F7F8FB]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-end gap-4">
        <Link
          to="/internships/new"
          className="px-5 py-2.5 bg-[#2563EB] text-white rounded-full hover:bg-[#1D4ED8] transition shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Internship
        </Link>
      </div>
    </header>
  )
}