import { supabase } from './supabase'

/**
 * Log a platform user activity to the activity_logs table.
 * Intended for non-admin actions (students, universities, software houses, guests, admins).
 * Prefer triggers where possible; use this as a manual fallback.
 */
export async function logActivityAction(action, targetType, targetId = null, metadata = null) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.warn('[ActivityLogging] No user found, skipping activity log:', userError?.message)
      return false
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[ActivityLogging] Error fetching profile:', profileError)
      return false
    }

    const role = profile?.role || 'guest'

    const { error: insertError } = await supabase.from('activity_logs').insert({
      actor_id: user.id,
      role,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    })

    if (insertError) {
      console.error('[ActivityLogging] Failed to insert activity log:', insertError)
      return false
    }
    return true
  } catch (e) {
    console.error('[ActivityLogging] Unexpected error:', e)
    return false
  }
}