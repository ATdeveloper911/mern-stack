// Simple script to test Supabase auth connection and a dummy login
// Run with:  node backend/scripts/test-login.js

import { supabase } from '../config/supabase.js'

async function main() {
  // TODO: change these to one of your real dummy users
  const email = 'admin@test.aiilp.com'
  const password = 'Test1234!'

  console.log('Testing Supabase connection and login...')
  console.log('Project URL:', process.env.SUPABASE_URL || 'using hardcoded URL from config')

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('❌ Login failed:', error.message)
      process.exit(1)
    }

    console.log('✅ Login success. User ID:', user.id)

    // Also try to read the profile for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('⚠️ Could not read profile:', profileError.message)
    } else {
      console.log('Profile:', profile)
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

main()


