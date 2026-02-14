import { supabase } from './supabase'

// Use unified backend URL; default to empty so '/api' goes through Vite proxy in dev
// Only use if it's a valid HTTP(S) URL, otherwise ignore it in dev mode
const rawBackendUrl = import.meta.env.VITE_BACKEND_URL || ''
const API_BASE_URL = rawBackendUrl && rawBackendUrl.startsWith('http') 
  ? rawBackendUrl.replace(/\/$/, '') 
  : ''

// Default fallback: 1x1 transparent PNG as data URI (prevents broken image icon)
export function getDefaultProfilePictureUrl() {
  // Return a transparent 1x1 PNG data URI to prevent broken image icon
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
}

/**
 * Upload profile picture to backend
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
 */
export async function uploadProfilePicture(file, userId) {
  try {
    // Get current session token
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    const formData = new FormData()
    formData.append('picture', file)
    formData.append('userId', userId)

    // In development, use relative path to leverage Vite proxy
    // In production, use API_BASE_URL if set
    const isDev = !import.meta.env.PROD
    const url = isDev 
      ? '/api/profile/upload-picture' 
      : (API_BASE_URL ? `${API_BASE_URL}/api/profile/upload-picture` : '/api/profile/upload-picture')
    console.log('[API] Uploading to:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    let data
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      console.error('[API] Non-JSON response:', text.substring(0, 200))
      return {
        success: false,
        error: `Server error: ${response.status} ${response.statusText}. Is the backend server running?`,
      }
    }

    if (!response.ok) {
      return { success: false, error: data.error || `Upload failed: ${response.status}` }
    }

    return { success: true, filePath: data.filePath }
  } catch (error) {
    console.error('[API] Upload error:', error)
    // Check if it's a network error
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      // In dev, use proxy (no need for backend URL). In prod, show the configured URL
      const isDev = !import.meta.env.PROD
      const backendUrl = isDev 
        ? 'http://localhost:3001 (or check your Vite proxy configuration)' 
        : (API_BASE_URL || 'your backend server')
      return {
        success: false,
        error: `Cannot connect to backend server. Please make sure it is running at ${backendUrl}`,
      }
    }
    return { success: false, error: error.message || 'Upload failed' }
  }
}

/**
 * Normalize profile picture path to ensure consistent format
 * @param {string} path - Profile picture path from database
 * @returns {string|null} Normalized path or null if invalid
 */
function normalizeProfilePicturePath(path) {
  if (!path) return null
  if (path.startsWith('http')) return path // External URL, return as-is
  
  // Remove leading/trailing slashes and normalize
  const cleanPath = path.replace(/^\/+|\/+$/g, '')
  
  if (!cleanPath) return null
  
  // If it's just a filename (no directory), add /api/uploads/ prefix
  if (!cleanPath.includes('/') && !cleanPath.startsWith('api/uploads')) {
    return `/api/uploads/${cleanPath}`
  }
  
  // If it doesn't start with api/uploads, add the prefix
  if (!cleanPath.startsWith('api/uploads')) {
    return `/api/uploads/${cleanPath}`
  }
  
  // Ensure it starts with /
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
}

/**
 * Get full URL for profile picture
 * @param {string} filePath - Relative file path from database
 * @returns {string|null} Full URL to the image or null if invalid
 */
export function getProfilePictureUrl(filePath) {
  if (!filePath) return null
  
  // Normalize the path first
  const normalizedPath = normalizeProfilePicturePath(filePath)
  if (!normalizedPath) return null
  
  // If it's already an external URL, return as-is
  if (normalizedPath.startsWith('http')) return normalizedPath
  
  // In development, ALWAYS use relative paths to leverage Vite proxy
  // This prevents issues with port mismatches or malformed URLs
  const isDev = !import.meta.env.PROD
  
  if (isDev) {
    // Always return relative path in dev mode for Vite proxy
    // This ensures the request goes through Vite's proxy to the backend
    return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  }
  
  // In production, use API_BASE_URL if provided and valid (starts with http)
  if (API_BASE_URL && API_BASE_URL.startsWith('http')) {
    return `${API_BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`
  }
  
  // Fallback: return relative path
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
}

/**
 * Validate and normalize profile picture URL
 * Logs warnings for malformed URLs
 * @param {string} filePath - Profile picture path from database
 * @returns {string|null} Normalized URL or null if invalid
 */
export function validateProfilePictureUrl(filePath) {
  if (!filePath) return null
  
  const normalized = normalizeProfilePicturePath(filePath)
  
  // Log warning if path was malformed
  if (filePath && normalized && filePath !== normalized && !filePath.startsWith('http')) {
    console.warn('[Profile Picture] Normalized malformed path:', {
      original: filePath,
      normalized: normalized
    })
  }
  
  return normalized ? getProfilePictureUrl(normalized) : null
}
