import { supabase } from './supabase'

/**
 * Log an admin action to the database
 * This function handles errors gracefully and ensures logs are written
 * @param {string} action - Action name (e.g., 'approve_account', 'login', 'logout')
 * @param {string} targetType - Type of target (e.g., 'profile', 'internship', 'system')
 * @param {string|null} targetId - ID of the target (optional)
 * @param {string|null} feedback - Feedback or reason (optional)
 * @param {object|null} metadata - Additional metadata (optional)
 * @returns {Promise<boolean>} - Returns true if logged successfully
 */
export async function logAdminAction(action, targetType, targetId = null, feedback = null, metadata = null) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.warn('[Logging] No user found, skipping log:', userError?.message)
      return false
    }

    console.log('[Logging] Attempting to log action:', { action, targetType, userId: user.id })

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Logging] Error fetching profile:', profileError)
      return false
    }

    if (profile?.role !== 'admin') {
      console.log('[Logging] User is not admin, skipping log')
      return false
    }

    console.log('[Logging] User is admin, proceeding with log')

    // Try using the database function first (more reliable, bypasses RLS)
    const { data: functionData, error: functionError } = await supabase.rpc('log_admin_action', {
      p_admin_id: user.id,
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_feedback: feedback,
      p_metadata: metadata,
    })

    if (!functionError && functionData) {
      console.log('[Logging] Successfully logged via function:', functionData)
      return true
    }

    // Fallback to direct insert if function doesn't exist or fails
    console.warn('[Logging] Function failed, trying direct insert:', functionError?.message)

    const { data: insertData, error: insertError } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        feedback,
        metadata,
      })
      .select()

    if (insertError) {
      console.error('[Logging] Failed to log action (direct insert):', insertError)
      console.error('[Logging] Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })
      return false
    }

    console.log('[Logging] Successfully logged via direct insert:', insertData)
    return true
  } catch (error) {
    console.error('[Logging] Unexpected error logging action:', error)
    return false
  }
}

/**
 * Log user login action
 */
export async function logLogin(userId, email) {
  // Only log if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin') {
    await logAdminAction(
      'admin_login',
      'system',
      userId,
      `Admin logged in: ${email}`,
      { email, timestamp: new Date().toISOString() },
    )
  }
}

/**
 * Log user logout action
 */
export async function logLogout(userId, email) {
  // Only log if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'admin') {
    await logAdminAction(
      'admin_logout',
      'system',
      userId,
      `Admin logged out: ${email}`,
      { email, timestamp: new Date().toISOString() },
    )
  }
}

/**
 * Log profile picture upload
 */
export async function logProfilePictureUpload(userId) {
  await logAdminAction('upload_profile_picture', 'profile', userId, null, {
    timestamp: new Date().toISOString(),
  })
}

