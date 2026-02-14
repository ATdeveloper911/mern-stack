import React from 'react'
import { createPortal } from 'react-dom'
import { getProfilePictureUrl } from '../utils/api'

export default function ProfilePictureModal({ isOpen, onClose, profilePicture, userName, userEmail, userRole }) {
  if (!isOpen) return null

  const pictureUrl = profilePicture ? getProfilePictureUrl(profilePicture) : null
  const initial = userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'
  
  // Format role for display (capitalize first letter)
  const displayRole = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : null
  // Show role if provided, otherwise fall back to email
  const displaySubtext = displayRole || userEmail || ''

  // Helper to open the image in a new tab
  const openOriginal = () => {
    if (!pictureUrl) return
    window.open(pictureUrl, '_blank', 'noopener,noreferrer')
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-[94vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{userName || 'User'}</div>
            <div className="text-xs text-gray-500 truncate">{displaySubtext}</div>
          </div>
          <div className="flex items-center gap-2">
            {pictureUrl && (
              <button
                type="button"
                onClick={openOriginal}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Open original
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Image area: show complete image with natural aspect ratio */}
        <div className="bg-gray-50 flex items-center justify-center max-h-[80vh]" style={{ height: 'calc(80vh - 56px)' }}>
          {pictureUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={pictureUrl}
                alt={userName || 'Profile'}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  // Hide broken image and show fallback
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div className="flex flex-col items-center justify-center py-12 hidden">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-white">{initial}</span>
                </div>
                <div className="text-sm text-gray-500">Profile picture failed to load</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-white">{initial}</span>
              </div>
              <div className="text-sm text-gray-500">No profile picture uploaded</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}

