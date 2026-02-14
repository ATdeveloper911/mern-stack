import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabase'
import { logLogin, logLogout } from '../utils/logging'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Fetch profile helper
  const fetchProfile = async (id) => {
    try {
      console.log('[Auth] Fetching profile for user:', id)
      const { data, error } = await supabase
        .from('profiles')
        // Include approval fields for gating and basic identity info
        .select('id, role, university_id, profile_picture, created_at, updated_at, approval_status, is_active, full_name, organization_name, email')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.error('[Auth] fetchProfile error:', error)
        return null
      }

      if (!data) {
        console.warn('[Auth] No profile found for user in fetchProfile')
        return null
      }

      console.log('[Auth] Profile loaded:', data)
      setProfile(data)
      return data
    } catch (err) {
      console.error('[Auth] fetchProfile unexpected error:', err)
      return null
    }
  }

  // Ensure a server-side profile exists (uses service role via backend)
  const ensureProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.warn('[Auth] ensureProfile error (non-fatal):', err)
    }
  }

  // Initial session load + auth state listener
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[Auth] Initializing auth session')
      const {
        data: { session },
          error,
      } = await supabase.auth.getSession()

        if (error) {
          console.error('[Auth] getSession error:', error)
        }

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          // First try to fetch existing profile
          const existingProfile = await fetchProfile(currentUser.id)
          // Only call ensureProfile if no profile exists (to avoid overwriting updated fields like full_name)
          if (!existingProfile) {
            await ensureProfile()
            await fetchProfile(currentUser.id)
          }
        } else {
          setProfile(null)
        }

        // Mark initialization complete after resolving getSession
        setInitialized(true)
        setLoading(false)
      } catch (err) {
        console.error('[Auth] init unexpected error:', err)
      }
    }

    init()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange:', event, !!session)
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // First try to fetch existing profile
        fetchProfile(currentUser.id).then((existingProfile) => {
          // Only call ensureProfile if no profile exists (to avoid overwriting updated fields like full_name)
          if (!existingProfile) {
            ensureProfile().finally(() => fetchProfile(currentUser.id))
          }
        })
      } else {
        setProfile(null)
      }

      // If for any reason initialization wasn't marked during getSession, mark it here
      if (!initialized && event === 'INITIAL_SESSION') {
        setInitialized(true)
        setLoading(false)
      }
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email, password, roleHint) => {
    console.log('[Auth] signIn started for', email, 'roleHint:', roleHint)
    try {
      // Special handling for student login
      if (roleHint === 'student') {
        console.log('[Auth] Student login detected, trying direct login first...')
        
        // First, try to sign in directly with the provided password
        // This allows students who have changed their password to login with the new password
        const directLoginResult = await supabase.auth.signInWithPassword({ 
          email: email.trim().toLowerCase(), 
          password: password.trim() 
        })
        
        // If direct login succeeds, verify it's a student and proceed
        if (directLoginResult.data?.user && !directLoginResult.error) {
          console.log('[Auth] Direct login successful, verifying student role...')
          // Verify the user is actually a student
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', directLoginResult.data.user.id)
            .maybeSingle()
          
          if (profileData?.role === 'student') {
            console.log('[Auth] Confirmed student role, using direct login (password may have been changed)')
            // Use the direct login result and continue with normal flow below
            // We'll set a flag to skip the student_id verification
            const { data, error } = directLoginResult
            
            if (error) {
              console.error('[Auth] signIn error after direct login:', error)
              return { data: null, error }
            }

            const signedInUser = data.user
            console.log('[Auth] signIn success. User:', signedInUser?.id)

            if (!signedInUser) {
              return { data: null, error: { message: 'Login failed: user not found.' } }
            }

            // Fetch profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', signedInUser.id)
              .maybeSingle()

            if (profileError) {
              console.error('[Auth] Profile fetch error:', profileError)
            }

            setUser(signedInUser)
            setProfile(profile || null)

            return { data: { user: signedInUser, profile }, error: null }
          } else {
            // Not a student, sign out and continue with student_id verification
            console.log('[Auth] User is not a student, trying student_id verification...')
            await supabase.auth.signOut()
          }
        }
        
        // If direct login failed or user is not a student, try student_id verification
        // This handles the case where student is still using student_id as password
        console.log('[Auth] Direct login failed or not student, trying student_id verification...')
        
        // Call backend to verify email and student_id match
        const isDev = !import.meta.env.PROD
        const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
        const verifyUrl = isDev 
          ? '/api/auth/student-login-verify'
          : (backendUrl ? `${backendUrl}/api/auth/student-login-verify` : '/api/auth/student-login-verify')
        
        try {
          const verifyResponse = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: email.trim().toLowerCase(),
              student_id: password.trim() // password field contains student_id for students
            }),
          })

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json().catch(() => ({ error: verifyResponse.statusText }))
            console.error('[Auth] Student verification failed:', errorData)
            return { 
              data: null, 
              error: { 
                message: errorData.error || 'Student ID verification failed. Please check your email and student ID, or use your new password if you changed it.' 
              } 
            }
          }

          const verifyResult = await verifyResponse.json()
          
          if (!verifyResult.valid) {
            console.error('[Auth] Student verification returned invalid:', verifyResult)
            return { 
              data: null, 
              error: { 
                message: verifyResult.error || 'Student ID verification failed. If you changed your password, please use your new password to login.' 
              } 
            }
          }

          // Use the actual password from credentials to sign in
          console.log('[Auth] Student verification successful, signing in with actual password...')
          password = verifyResult.actual_password
        } catch (verifyError) {
          console.error('[Auth] Student verification error:', verifyError)
          return { 
            data: null, 
            error: { 
              message: 'Failed to verify student credentials. If you changed your password, please use your new password to login.' 
            } 
          }
        }
      }

      // Proceed with normal Supabase auth (using actual password for students, original password for others)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('[Auth] signIn error:', error)
        return { data: null, error }
      }

      const signedInUser = data.user
      console.log('[Auth] signIn success. User:', signedInUser?.id)

      if (!signedInUser) {
        return { data: null, error: { message: 'Login failed: user not found.' } }
      }

      // Early gating: if user is attempting university login and email is not confirmed, block immediately
      const earlyEmailConfirmed = !!(signedInUser?.email_confirmed_at || signedInUser?.confirmed_at)
      if (roleHint === 'university' && !earlyEmailConfirmed) {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        return { data: null, error: { message: 'Please open your invitation email and confirm your account before logging in.' } }
      }

      // Ensure server-side profile exists for invited/verified users
      await ensureProfile()
      const userProfile = await fetchProfile(signedInUser.id)

      // If profile row is missing (common when INSERT isn’t allowed by RLS),
      // proceed with a safe client-side fallback so the user can log in.
      // This enables navigation while you fix DB policies or seed profiles.
      if (!userProfile) {
        const fallbackProfile = {
          id: signedInUser.id,
          role: roleHint || 'student',
          university_id: null,
          profile_picture: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        console.warn('[Auth] No profile row found; using fallback profile:', fallbackProfile)
        setProfile(fallbackProfile)
        return { data: { user: signedInUser, profile: fallbackProfile }, error: null }
      }

      // Check email confirmation status first (before other checks)
      const emailConfirmed = !!(signedInUser?.email_confirmed_at || signedInUser?.confirmed_at)
      
      // Require invitation email confirmation for university and software_house (admin-created users)
      // These users receive invitation emails and must confirm before logging in
      if ((userProfile?.role === 'university' || userProfile?.role === 'software_house') && !emailConfirmed) {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        return { data: null, error: { message: 'Please open your invitation email and confirm your account by clicking the link before logging in.' } }
      }

      // Auto-activate university account once email is confirmed
      if (userProfile?.role === 'university' && emailConfirmed && userProfile?.is_active === false) {
        try {
          await supabase
            .from('profiles')
            .update({ is_active: true })
            .eq('id', signedInUser.id)
          await fetchProfile(signedInUser.id)
        } catch (e) {
          console.warn('[Auth] Failed to auto-activate after confirmation:', e)
        }
      }

      // Enforce admin approval gating before allowing navigation
      if (userProfile) {
        // First: approval gating takes precedence over activity status
        if (userProfile.approval_status) {
          if (userProfile.approval_status === 'rejected') {
            await supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            return { data: null, error: { message: 'Your account request was rejected. Please contact administrator.' } }
          }
          if (userProfile.approval_status !== 'approved') {
            await supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            return { data: null, error: { message: 'Admin has not approved your account yet. Please wait for approval.' } }
          }
        }

        // Then: deactivation check (only if email is confirmed)
        // If email is not confirmed, we already showed the email confirmation message above
        if (emailConfirmed && userProfile.is_active === false) {
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          return { data: null, error: { message: 'Account is deactivated. Please contact administrator.' } }
        }
      }

      // Log admin login
      if (userProfile.role === 'admin') {
        logLogin(signedInUser.id, signedInUser.email).catch((err) =>
          console.error('[Auth] Failed to log login:', err),
        )
      }

      return { data: { user: signedInUser, profile: userProfile }, error: null }
    } catch (err) {
      console.error('[Auth] signIn unexpected error:', err)
      return { data: null, error: err }
    }
  }

  const signUp = async (email, password, role, profileData = {}) => {
    console.log('[Auth] signUp started for', email, 'role:', role)
    try {
    // Validate email format before attempting signup
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !email.trim()) {
      return { data: null, error: { message: 'Email is required' } }
    }
    if (!emailRegex.test(email.trim())) {
      return { data: null, error: { message: 'Invalid email address format' } }
    }
    
    // Sign up user - Supabase will automatically send confirmation email via SMTP if:
    // 1. Email confirmation is enabled in Supabase settings
    // 2. SMTP is configured in Supabase Dashboard → Project Settings → Authentication → SMTP Settings
    // The confirmation email is sent automatically by Supabase using the configured SMTP service
    const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
          data: {
            role,
            full_name: profileData.full_name || null,
            organization_name: profileData.organization_name || null,
            approval_status: 'pending',
            is_active: false,
          },
        },
      })
      
      // If there's any error (including email sending errors), signup fails
      if (error) {
        console.error('[Auth] signUp error:', error)
        // Check if it's an email-related error
        if (error.message && (
          error.message.includes('email') || 
          error.message.includes('confirmation email') ||
          error.message.includes('Error sending')
        )) {
          console.error('[Auth] Email error detected - signup will fail')
          // If user was created but email failed, we need to clean up
          if (data?.user?.id) {
            console.warn('[Auth] User was created but email failed. This indicates invalid email or SMTP issue.')
            // Try to delete the user since email couldn't be sent
            try {
              await supabase.auth.admin.deleteUser(data.user.id).catch(() => {})
            } catch (deleteErr) {
              console.warn('[Auth] Could not clean up user after email failure:', deleteErr)
            }
          }
          return { 
            data: null, 
            error: { 
              message: 'Invalid email address or email could not be sent. Please check your email address and try again.' 
            } 
          }
        }
        return { data: null, error }
      }

    // Verify user was actually created
    if (!data || !data.user || !data.user.id) {
      console.error('[Auth] Signup returned no user data')
      return { 
        data: null, 
        error: { message: 'User creation failed - no user data returned' } 
      }
    }

    const userId = data.user.id
      console.log('[Auth] signUp success. New user:', userId)
      
      // Note: Supabase automatically sends confirmation email via SMTP when signUp() is called
      // We don't need to manually resend - that would cause duplicate emails
      // The confirmation email is sent automatically by Supabase using the configured SMTP
      if (data.user && !data.user.email_confirmed_at) {
        console.log('[Auth] ✅ User created successfully')
        console.log('[Auth] 📧 Confirmation email has been sent automatically via SMTP')
        console.log('[Auth] User should check their email inbox for the confirmation link')
      } else if (data.user && data.user.email_confirmed_at) {
        console.log('[Auth] ✅ User email is already confirmed')
      }

    if (userId) {
        // Create or update profile with pending approval and inactive by default
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            role,
            university_id: null,
            profile_picture: null,
            full_name: profileData.full_name || null,
            organization_name: profileData.organization_name || null,
            email,
            approval_status: 'pending',
            is_active: false,
          })

        if (profileError) {
          console.error('[Auth] profile upsert error:', profileError)
          // We still return success for auth, but log profile issues
        } else {
          await fetchProfile(userId)
        }
      }

    return { data, error: null }
    } catch (err) {
      console.error('[Auth] signUp unexpected error:', err)
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    console.log('[Auth] signOut called')
    
    // Log admin logout before signing out
    if (user && profile?.role === 'admin') {
      logLogout(user.id, user.email).catch((err) => console.error('[Auth] Failed to log logout:', err))
    }
    
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (updates) => {
    if (!user?.id) return { error: 'Not authenticated' }
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (updateError) {
        console.error('[Auth] updateProfile error:', updateError)
        return { error: updateError }
      }

      // Refresh profile
      await fetchProfile(user.id)
      return { error: null }
    } catch (err) {
      console.error('[Auth] updateProfile unexpected error:', err)
      return { error: err }
    }
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      initialized,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [user, profile, loading, initialized],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}