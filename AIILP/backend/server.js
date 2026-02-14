import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { generatePassword } from './utils/helpers.js'
import { parseCSV, validateStudentCSV } from './utils/csvParser.js'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Supabase client - use hardcoded values from config for now
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://llfskketkhdqetriubjc.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZnNra2V0a2hkcWV0cml1YmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDEzOTMsImV4cCI6MjA4MTQ3NzM5M30.AtomcTsTl0gBcZFxsai9q7Dxs1nBmoZYkEZznj6zai8'
const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) : null

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log('Created uploads directory')
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId || 'unknown'
    const timestamp = Date.now()
    const ext = path.extname(file.originalname)
    const filename = `profile-${userId}-${timestamp}${ext}`
    cb(null, filename)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'))
    }
  },
})

// Enable CORS for all routes and handle preflight requests
app.use(cors())
app.options('*', cors())

// Basic request logging to aid debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`)
  console.log(`[Headers] Authorization: ${req.headers.authorization ? 'Present' : 'Missing'}`)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[Request Body]`, JSON.stringify(req.body, null, 2))
  }
  next()
})
// JSON parser with strict: false to handle empty bodies gracefully
app.use(express.json({ strict: false }))

// Wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err)
  console.error('[Global Error Handler] Stack:', err.stack)
  if (res.headersSent) {
    return next(err)
  }
  const statusCode = err.status || err.statusCode || 500
  res.status(statusCode).json({ 
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason)
  console.error('[Unhandled Rejection] Promise:', promise)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error)
  process.exit(1)
})

// Serve static files from uploads directory with proper headers
// Serve static files from uploads directory with proper headers and error handling
app.use('/api/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  
  // Set cache headers
  res.header('Cache-Control', 'public, max-age=31536000')
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  // Log request for debugging
  const requestedFile = req.path.replace(/^\/+/, '')
  console.log(`[Static Files] Serving: ${requestedFile} from ${uploadsDir}`)
  
  // Use express.static to serve files
  express.static(uploadsDir, {
    dotfiles: 'deny',
    index: false,
    setHeaders: (res, path) => {
      // Set appropriate content type
      if (path.match(/\.(jpg|jpeg)$/i)) {
        res.setHeader('Content-Type', 'image/jpeg')
      } else if (path.match(/\.png$/i)) {
        res.setHeader('Content-Type', 'image/png')
      } else if (path.match(/\.gif$/i)) {
        res.setHeader('Content-Type', 'image/gif')
      } else if (path.match(/\.webp$/i)) {
        res.setHeader('Content-Type', 'image/webp')
      }
    }
  })(req, res, (err) => {
    if (err) {
      // If file not found, return 404 with proper JSON or image
      if (err.status === 404) {
        console.warn(`[Static Files] File not found: ${requestedFile}`)
        // Check if it's an image request
        if (req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          // Return a 1x1 transparent PNG for missing images
          const transparentPng = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
          )
          res.status(404).type('image/png').send(transparentPng)
        } else {
          res.status(404).json({ error: 'File not found', path: requestedFile })
        }
      } else {
        console.error(`[Static Files] Error serving ${requestedFile}:`, err)
        next(err)
      }
    } else {
      next()
    }
  })
})

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Diagnostic endpoint to check server configuration
app.get('/api/diagnostic', (_req, res) => {
  res.json({
    server: 'running',
    supabaseUrl: supabaseUrl ? 'configured' : 'missing',
    supabaseKey: supabaseKey ? 'configured' : 'missing',
    supabaseAdmin: supabaseAdmin ? 'configured' : 'NOT CONFIGURED - Admin operations will fail!',
    serviceRoleKey: supabaseServiceKey ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  })
})

// Test endpoint to verify server is running
app.get('/api/test', (_req, res) => {
  res.json({ 
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    routes: [
      'GET /health',
      'GET /api/test',
      'POST /api/profile/upload-picture',
      'GET /api/uploads/:filename'
    ]
  })
})

// Placeholder route
app.get('/', (_req, res) => {
  res.send('AIILP backend is running')
})

// Upload profile picture endpoint
app.post('/api/profile/upload-picture', upload.single('picture'), async (req, res) => {
  console.log('[Server] Upload endpoint hit')
  console.log('[Server] Request body keys:', Object.keys(req.body))
  console.log('[Server] File:', req.file ? 'present' : 'missing')
  try {
    if (!req.file) {
      console.log('[Server] No file in request')
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const userId = req.body.userId
    if (!userId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Verify user exists and get auth token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      fs.unlinkSync(req.file.path)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user || user.id !== userId) {
      fs.unlinkSync(req.file.path)
      return res.status(403).json({ error: 'Forbidden' })
    }

    // File path relative to uploads directory - ensure consistent format
    // Always use /api/uploads/filename format
    const filename = req.file.filename
    const filePath = `/api/uploads/${filename}`
    
    console.log(`[Upload] Saving profile picture: ${filePath} for user: ${userId}`)

    // Update profile in database with normalized path
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_picture: filePath })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      fs.unlinkSync(req.file.path)
      return res.status(500).json({ error: 'Failed to update profile' })
    }

    res.json({ success: true, filePath })
  } catch (error) {
    console.error('Upload error:', error)
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    res.status(500).json({ error: error.message || 'Upload failed' })
  }
})

// Student login verification: verify email and student_id match
app.post('/api/auth/student-login-verify', async (req, res) => {
  try {
    if (!supabaseAdmin) {
      console.error('[Student Login Verify] Service role key not configured')
      return res.status(500).json({ 
        error: 'Service role key is not configured',
        code: 'SERVICE_ROLE_KEY_MISSING'
      })
    }

    const { email, student_id } = req.body || {}
    
    if (!email || !student_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: email and student_id are required' 
      })
    }

    console.log(`[Student Login Verify] Verifying student login for email: ${email}, student_id: ${student_id}`)

    // Find student by email
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('user_id, email, student_id, credentials')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (studentError) {
      console.error('[Student Login Verify] Database error:', studentError)
      return res.status(500).json({ 
        error: 'Database error while verifying student',
        code: 'DATABASE_ERROR'
      })
    }

    if (!student) {
      console.warn(`[Student Login Verify] Student not found for email: ${email}`)
      return res.status(404).json({ 
        valid: false,
        error: 'Email not found in students database' 
      })
    }

    // Verify student_id matches (case-sensitive)
    if (student.student_id !== student_id.trim()) {
      console.warn(`[Student Login Verify] Student ID mismatch for email: ${email}. Expected: ${student.student_id}, Got: ${student_id}`)
      return res.status(401).json({ 
        valid: false,
        error: 'Student ID does not match' 
      })
    }

    // Verify user role is 'student' in profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active, approval_status')
      .eq('id', student.user_id)
      .maybeSingle()

    if (profileError) {
      console.error('[Student Login Verify] Profile error:', profileError)
      return res.status(500).json({ 
        error: 'Error checking user profile',
        code: 'PROFILE_ERROR'
      })
    }

    if (!profile) {
      console.warn(`[Student Login Verify] Profile not found for user: ${student.user_id}, attempting to create...`)
      
      // Try to create the profile if it doesn't exist
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: student.user_id,
          role: 'student',
          email: student.email,
          full_name: student.name || null
        }, {
          onConflict: 'id'
        })
        .select('role, is_active, approval_status')
        .single()

      if (createProfileError || !newProfile) {
        console.error(`[Student Login Verify] Failed to create profile for user: ${student.user_id}`, createProfileError)
        return res.status(404).json({ 
          valid: false,
          error: 'User profile not found and could not be created. Please contact administrator.' 
        })
      }
      
      // Use the newly created profile
      profile = newProfile
      console.log(`[Student Login Verify] Profile created for user: ${student.user_id}`)
    }

    if (profile.role !== 'student') {
      console.warn(`[Student Login Verify] User role is not student. Role: ${profile.role}`)
      return res.status(403).json({ 
        valid: false,
        error: 'Account is not a student account' 
      })
    }

    // Check if account is active
    if (profile.is_active === false) {
      console.warn(`[Student Login Verify] Account is deactivated for user: ${student.user_id}`)
      return res.status(403).json({ 
        valid: false,
        error: 'Account is deactivated. Please contact administrator.' 
      })
    }

    // Get actual password from credentials JSONB
    const credentials = student.credentials || {}
    const actualPassword = credentials.password

    if (!actualPassword) {
      console.error(`[Student Login Verify] No password found in credentials for user: ${student.user_id}`)
      return res.status(500).json({ 
        error: 'Password not found in student record',
        code: 'PASSWORD_MISSING'
      })
    }

    console.log(`[Student Login Verify] ✅ Verification successful for email: ${email}, user_id: ${student.user_id}`)

    return res.json({
      valid: true,
      user_id: student.user_id,
      actual_password: actualPassword
    })
  } catch (err) {
    console.error('[Student Login Verify] Route error:', err)
    console.error('[Student Login Verify] Stack:', err.stack)
    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      code: 'STUDENT_LOGIN_VERIFY_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

// Listen on all interfaces (0.0.0.0) to accept connections from both IPv4 and IPv6
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60))
  console.log(`AIILP backend server listening on http://localhost:${PORT}`)
  console.log(`Uploads directory: ${uploadsDir}`)
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`Service Role Key configured: ${supabaseAdmin ? '✅ YES' : '❌ NO'}`)
  if (!supabaseAdmin) {
    console.error('')
    console.error('⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️')
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured!')
    console.error('All admin operations (create, edit, delete, activate, deactivate) will fail!')
    console.error('')
    console.error('To fix this:')
    console.error('1. Get your Service Role Key from Supabase Dashboard:')
    console.error('   Project Settings → API → Service Role Key')
    console.error('2. Create a .env file in the backend directory')
    console.error('3. Add: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
    console.error('4. Restart the backend server')
    console.error('')
  }
  console.log('Available routes:')
  console.log('  GET  /health')
  console.log('  GET  /api/diagnostic')
  console.log('  GET  /')
  console.log('  POST /api/profile/upload-picture')
  console.log('  GET  /api/uploads/:filename')
  console.log('  POST /api/auth/check-email')
  console.log('  POST /api/auth/resend-confirmation')
  console.log('  POST /api/auth/ensure-profile')
  console.log('  POST /api/auth/student-login-verify')
  console.log('  POST /api/admin/create-user')
  console.log('  PUT  /api/admin/users/:id')
  console.log('  DELETE /api/admin/users/:id')
  console.log('  POST /api/admin/users/:id/activate')
  console.log('  POST /api/admin/users/:id/deactivate')
  console.log('  POST /api/university/bulk-upload-students')
  console.log('='.repeat(60))
})

// Check if email already exists in the system
app.post('/api/auth/check-email', async (req, res) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ 
        error: 'Service role key not configured',
        code: 'SERVICE_ROLE_KEY_MISSING',
        details: 'Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env'
      })
    }

    // Check if user exists in auth.users
    // Note: Supabase Admin API doesn't have a direct "getUserByEmail" method
    // We'll use listUsers with pagination to search for the email
    const normalizedEmail = email.trim().toLowerCase()
    let emailExists = false
    let page = 1
    const perPage = 1000 // Max users per page
    
    // Search through users in batches
    while (true) {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })
      
      if (listError) {
        console.error('[Check Email] Error listing users:', listError)
        // If we can't check, return false (don't block signup - let Supabase handle it)
        return res.json({ 
          exists: false,
          message: 'Unable to verify email existence',
          error: 'Check failed but signup can proceed'
        })
      }

      // Check if email exists in current page
      if (usersData.users && usersData.users.length > 0) {
        emailExists = usersData.users.some(user => 
          user.email?.toLowerCase() === normalizedEmail
        )
        
        if (emailExists) {
          break // Found the email, stop searching
        }
      }

      // If we got fewer users than perPage, we've reached the end
      if (!usersData.users || usersData.users.length < perPage) {
        break
      }

      // Move to next page
      page++
      
      // Safety limit: don't search more than 10 pages (10,000 users)
      if (page > 10) {
        console.warn('[Check Email] Reached page limit, stopping search')
        break
      }
    }

    return res.json({ 
      exists: emailExists,
      message: emailExists ? 'Email already exists' : 'Email is available'
    })
  } catch (err) {
    console.error('[Check Email] Exception:', err)
    return res.status(500).json({ 
      error: err.message || 'Internal error',
      details: 'Check backend logs for more information'
    })
  }
})

// Send approval/rejection email to user
app.post('/api/admin/send-approval-email', async (req, res) => {
  try {
    const { userId, action, feedback, userEmail: providedEmail, userName, userRole } = req.body
    
    if (!userId || !action) {
      return res.status(400).json({ error: 'Missing required fields: userId and action are required' })
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ 
        error: 'Service role key not configured',
        code: 'SERVICE_ROLE_KEY_MISSING',
        details: 'Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env'
      })
    }

    // Get user email from auth.users if not provided
    let userEmail = providedEmail
    if (!userEmail) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (authError || !authUser?.user?.email) {
        console.warn(`[Approval Email] Could not fetch email for user ${userId}:`, authError?.message || 'User not found')
        return res.status(400).json({ error: 'Could not find user email. User may not exist in auth.users' })
      }
      userEmail = authUser.user.email
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' })
    }

    console.log(`[Approval Email] Sending ${action} email to ${userEmail} for user ${userId}`)

    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173'
    const loginUrl = `${frontendUrl}/login`
    
    // Prepare email content based on action
    const isApproved = action === 'approve'
    const subject = isApproved 
      ? 'Account Approved - Welcome to AIILP Platform'
      : 'Account Review - Action Required'
    
    const emailBody = isApproved
      ? `Dear ${userName || 'User'},

Your account has been approved! You can now log in to the AIILP platform.

Login URL: ${loginUrl}

Your Role: ${userRole ? userRole.replace('_', ' ') : 'User'}

Thank you for your patience during the review process.

Best regards,
AIILP Admin Team`
      : `Dear ${userName || 'User'},

We regret to inform you that your account request has been reviewed and we are unable to approve it at this time.

${feedback ? `Reason: ${feedback}` : 'Please contact support for more information.'}

If you believe this is an error or have additional information to provide, please contact our support team.

Best regards,
AIILP Admin Team`

    // Use Supabase's email sending capability
    // Since Supabase doesn't have a direct custom email API, we'll use inviteUserByEmail 
    // for approved users (to send a welcome email) or generateLink for rejected users
    if (isApproved) {
      // For approved users, send an invitation email that acts as a welcome/approval email
      // This uses Supabase's built-in email templates via SMTP
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(userEmail, {
        redirectTo: loginUrl,
        data: {
          approval_status: 'approved',
          custom_message: emailBody
        }
      })

      if (!inviteError) {
        console.log(`[Approval Email] ✅ Approval email sent to ${userEmail} via inviteUserByEmail`)
        return res.json({ 
          success: true,
          message: 'Approval email sent successfully',
          method: 'inviteUserByEmail'
        })
      }

      console.warn(`[Approval Email] inviteUserByEmail failed:`, inviteError?.message || inviteError)
    }

    // Fallback: Use generateLink to create a link (email will be sent via SMTP if configured)
    // For rejected users, we'll generate a recovery link that can be used to contact support
    const linkType = isApproved ? 'signup' : 'recovery'
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: linkType,
      email: userEmail,
      options: {
        redirectTo: loginUrl,
      }
    })

    if (linkError) {
      console.error(`[Approval Email] generateLink failed:`, linkError)
      return res.status(400).json({ 
        error: 'Failed to send approval email',
        details: linkError.message || 'Both email methods failed',
        troubleshooting: [
          '1. Check SMTP configuration in Supabase Dashboard → Project Settings → Authentication → SMTP Settings',
          '2. Verify the email address is correct',
          '3. Check Supabase Auth Logs for email delivery errors'
        ]
      })
    }

    console.log(`[Approval Email] ✅ Link generated for ${action} email to ${userEmail}`)
    console.log(`[Approval Email] Note: Email should be sent automatically via SMTP if configured`)
    
    return res.json({ 
      success: true,
      message: `${action === 'approve' ? 'Approval' : 'Rejection'} email link generated. Email should be sent via SMTP.`,
      method: 'generateLink',
      warning: 'If email not received, verify SMTP is configured in Supabase'
    })
  } catch (err) {
    console.error('[Approval Email] Exception:', err)
    return res.status(500).json({ 
      error: err.message || 'Internal error',
      details: 'Check backend logs for more information'
    })
  }
})

// Resend confirmation email for a user
app.post('/api/auth/resend-confirmation', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ 
        error: 'Service role key not configured',
        code: 'SERVICE_ROLE_KEY_MISSING',
        details: 'Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env'
      })
    }

    console.log(`[Resend Confirmation] Attempting to send confirmation email to ${email}`)

    // Method 1: Try to use inviteUserByEmail (works for unconfirmed users)
    // This actually sends an email, not just generates a link
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/login?verified=true`,
      data: {}
    })

    if (!inviteError) {
      console.log('[Resend Confirmation] ✅ Confirmation email sent via inviteUserByEmail')
      return res.json({ 
        success: true,
        message: 'Confirmation email sent successfully. Please check your email inbox.',
        method: 'inviteUserByEmail'
      })
    }

    console.warn('[Resend Confirmation] inviteUserByEmail failed:', inviteError?.message || inviteError)
    console.log('[Resend Confirmation] Trying generateLink as fallback...')

    // Method 2: Fallback to generateLink (generates link but may not send email automatically)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/login?verified=true`,
      }
    })

    if (linkError) {
      console.error('[Resend Confirmation] generateLink also failed:', linkError)
      return res.status(400).json({ 
        error: 'Failed to send confirmation email',
        details: linkError.message || 'Both inviteUserByEmail and generateLink failed',
        troubleshooting: [
          '1. Check if email confirmation is enabled in Supabase Dashboard → Authentication → Providers → Email',
          '2. Configure SMTP in Supabase Dashboard → Project Settings → Authentication → SMTP Settings',
          '3. Verify the email address is correct and user exists',
          '4. Check Supabase Auth Logs for email delivery errors'
        ]
      })
    }

    console.log('[Resend Confirmation] ⚠️  Link generated but email may not be sent automatically')
    console.log('[Resend Confirmation] Note: generateLink creates a link but requires SMTP to send email')
    
    return res.json({ 
      success: true,
      message: 'Confirmation link generated. Email should be sent if SMTP is configured.',
      warning: 'If email not received, SMTP may not be configured in Supabase',
      method: 'generateLink',
      troubleshooting: 'See backend/EMAIL_CONFIGURATION.md for SMTP setup instructions'
    })
  } catch (err) {
    console.error('[Resend Confirmation] Exception:', err)
    return res.status(500).json({ 
      error: err.message || 'Internal error',
      details: 'Check backend logs for more information'
    })
  }
})

// Ensure a profile exists for the authenticated user
app.post('/api/auth/ensure-profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[ensure-profile] No authorization header')
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.log('[ensure-profile] Auth error:', authError?.message || 'No user')
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    console.log(`[ensure-profile] Processing for user: ${user.id}`)
    const metaRole = user.user_metadata && user.user_metadata.role
    const metaNameRaw = user.user_metadata && user.user_metadata.full_name
    const metaName = typeof metaNameRaw === 'string' ? metaNameRaw.trim() : null

    if (supabaseAdmin) {
      // Check if profile exists first
      const { data: existing, error: selErr } = await supabaseAdmin
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', user.id)
        .maybeSingle()

      if (selErr) {
        console.error('[ensure-profile] Select error:', selErr)
        return res.status(500).json({ error: `Database error: ${selErr.message}` })
      }

      if (existing && existing.id) {
        // Update only non-destructive fields; NEVER override role or clear full_name
        const updatePayload = { email: user.email }
        if (metaRole && !existing.role) {
          updatePayload.role = metaRole
        }
        // Only update full_name if metadata provides a non-empty value
        if (metaName && metaName.length > 0) {
          updatePayload.full_name = metaName
        }
        if (Object.keys(updatePayload).length > 0) {
          const { error: updateErr } = await supabaseAdmin
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id)
          if (updateErr) {
            console.error('[ensure-profile] Update error:', updateErr)
            return res.status(500).json({ error: `Update error: ${updateErr.message}` })
          }
        }
      } else {
        // Create a new profile; if no role metadata, fall back to student
        const createPayload = {
          id: user.id,
          role: metaRole || 'student',
          email: user.email,
          full_name: metaName || null,
        }
        const { error: upsertErr } = await supabaseAdmin
          .from('profiles')
          .upsert(createPayload)
        if (upsertErr) {
          console.error('[ensure-profile] Upsert error:', upsertErr)
          return res.status(500).json({ error: `Profile creation error: ${upsertErr.message}` })
        }
      }
    } else {
      console.warn('[ensure-profile] Service role key not configured, using fallback')
      // Fallback without service role: attempt a safe update of email/full_name only
      const updatePayload = { email: user.email }
      if (metaName && metaName.length > 0) {
        updatePayload.full_name = metaName
      }
      if (Object.keys(updatePayload).length > 0) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id)
        if (updateErr) {
          console.error('[ensure-profile] Fallback update error:', updateErr)
          return res.status(500).json({ error: `Update error: ${updateErr.message}` })
        }
      }
    }

    return res.json({ ensured: true })
  } catch (err) {
    console.error('[ensure-profile] Route error:', err)
    console.error('[ensure-profile] Error stack:', err.stack)
    return res.status(500).json({ 
      error: err.message || 'Internal error', 
      code: 'ENSURE_PROFILE_ERROR',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    })
  }
})

// Helper: require auth and return user and role
async function requireAuth(req, res) {
  try {
    const authHeader = req.headers.authorization
    console.log(`[requireAuth] ${req.method} ${req.originalUrl} - Auth header: ${authHeader ? 'Present' : 'Missing'}`)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[requireAuth] No authorization header')
      res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' })
      return null
    }
    const token = authHeader.split(' ')[1]
    if (!token || token.length < 10) {
      console.log('[requireAuth] Invalid token format')
      res.status(401).json({ error: 'Unauthorized: Invalid token format' })
      return null
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.log('[requireAuth] Auth error:', authError?.message || 'No user')
      console.log('[requireAuth] Auth error details:', JSON.stringify(authError, null, 2))
      res.status(401).json({ error: `Unauthorized: ${authError?.message || 'Invalid token'}` })
      return null
    }
    console.log(`[requireAuth] User authenticated: ${user.id}`)
    
    // Use supabaseAdmin to bypass RLS when checking profile
    const profileClient = supabaseAdmin || supabase
    let profile = null
    let profileError = null
    
    try {
      const result = await profileClient
        .from('profiles')
        .select('role, university_id')
        .eq('id', user.id)
        .maybeSingle()
      profile = result.data
      profileError = result.error
    } catch (queryErr) {
      console.error('[requireAuth] Profile query exception:', queryErr)
      profileError = queryErr
    }
    
    if (profileError) {
      console.error('[requireAuth] Profile query error:', profileError)
      // If using regular supabase client and getting RLS error, try to continue with inferred role
      if (!supabaseAdmin && profileError.code === '42501') {
        console.warn('[requireAuth] RLS policy blocking profile access, using inferred role')
      } else if (!supabaseAdmin) {
        // For other errors without service role, log but continue
        console.warn('[requireAuth] Profile query failed without service role, using inferred role')
      } else {
        // With service role, this shouldn't happen, but log it
        console.error('[requireAuth] Profile query failed even with service role')
      }
    }
    
    // Auto-create missing profile using service role (bypasses RLS)
    let role = profile?.role
    let university_id = profile?.university_id || null
    if (!role) {
      const inferredRole = (user.user_metadata && user.user_metadata.role) || 'student'
      if (supabaseAdmin) {
        try {
          const { error: upsertErr } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: user.id, role: inferredRole })
          if (upsertErr) {
            console.warn('[requireAuth] Profile upsert on auth failed:', upsertErr.message)
          } else {
            role = inferredRole
            console.log(`[requireAuth] Created profile for user ${user.id} with role ${inferredRole}`)
          }
        } catch (upsertEx) {
          console.error('[requireAuth] Profile upsert exception:', upsertEx)
          // Continue with inferred role even if upsert fails
        }
      } else {
        console.warn('[requireAuth] Service role key missing; cannot auto-create profile for user:', user.id)
        // Still return the user with inferred role, but warn
        role = inferredRole
      }
    }
    
    console.log(`[requireAuth] Returning auth for user ${user.id} with role ${role}`)
    return { user, role, university_id }
  } catch (err) {
    console.error('[requireAuth] Exception:', err)
    console.error('[requireAuth] Stack:', err.stack)
    res.status(500).json({ error: err.message || 'Internal error', details: process.env.NODE_ENV === 'development' ? err.stack : undefined })
    return null
  }
}

// Create user (platform admins only). Sends verification email via invite.
app.post('/api/admin/create-user', async (req, res) => {
  try {
    const auth = await requireAuth(req, res)
    if (!auth) return
    if (auth.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin required' })
    }
    if (!supabaseAdmin) {
      console.error('[Create User] Service role key not configured')
      return res.status(500).json({ 
        error: 'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in backend/.env file and restart the server.',
        code: 'SERVICE_ROLE_KEY_MISSING'
      })
    }

    const { email, password, full_name, role } = req.body || {}
    if (!email || !full_name || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password, and full_name are required' })
    }
    const roleValue = role || 'student'

    console.log(`[Create User] Creating user with email: ${email}, role: ${roleValue}`)

    // Create auth user with password
    // Set email_confirm: false initially so we can send invitation email
    // After invitation is sent, we'll confirm the email
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Will be confirmed after invitation email is sent
      user_metadata: { full_name, role: roleValue },
    })
    if (error) {
      console.error('[Create User] Auth admin error:', error)
      return res.status(400).json({ error: error.message })
    }
    const userId = data?.user?.id
    if (!userId) {
      console.error('[Create User] User creation failed: no user id returned')
      return res.status(500).json({ error: 'User creation failed: no user id' })
    }

    const orgName = (req.body && req.body.organization_name) || (roleValue === 'university' ? full_name : null)
    // Admin-created users are automatically approved
    // Software house and guest only go to pending when they sign up themselves
    const profilePayload = {
      id: userId,
      role: roleValue,
      email,
      full_name,
      organization_name: orgName,
      approval_status: 'approved', // Admin-created users are always approved
      // Security: require invitation email verification before login for university admins
      // New default: university accounts are inactive until email is confirmed
      is_active: (roleValue === 'university')
        ? false // University accounts inactive until email confirmed
        : true, // Other admin-created accounts are active (software_house, etc.)
    }
    
    console.log(`[Create User] Creating profile for user ${userId} with payload:`, JSON.stringify(profilePayload, null, 2))
    // Use insert instead of upsert since this is a new user (profile shouldn't exist)
    const { data: insertedProfile, error: insertErr } = await supabaseAdmin
      .from('profiles')
      .insert(profilePayload)
      .select()
      .single()
    if (insertErr) {
      console.error('[Create User] Profile insert error:', insertErr)
      // Try to clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {})
      return res.status(500).json({ error: `Failed to create profile: ${insertErr.message}` })
    }
    console.log(`[Create User] Profile created successfully:`, JSON.stringify(insertedProfile, null, 2))
    
    // Double-check and force update approval_status if it wasn't set correctly
    // This ensures admin-created users are always approved, even if a trigger or default tried to change it
    if (insertedProfile?.approval_status !== 'approved') {
      console.warn(`[Create User] Profile approval_status is ${insertedProfile?.approval_status}, forcing to 'approved'`)
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ 
          approval_status: 'approved',
          is_active: (roleValue === 'university') ? false : true
        })
        .eq('id', userId)
      if (updateErr) {
        console.error('[Create User] Failed to force update approval_status:', updateErr)
      } else {
        console.log(`[Create User] Successfully forced approval_status to 'approved'`)
      }
    }

    // Log admin action
    const { error: logError } = await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: auth.user.id,
        action: 'create_user',
        target_type: 'profile',
        target_id: userId,
        metadata: { role: roleValue, email },
      })
    if (logError) {
      console.warn('[Create User] Failed to log action:', logError)
    }

    // Send invitation email to the user using SMTP
    // For admin-created users, we send an invitation email with a link to set their password
    // IMPORTANT: Do NOT confirm email immediately - let the invitation link confirm it
    // This ensures the email is actually sent and the user must click the link
    try {
      console.log(`[Create User] Sending invitation email to ${email} (role: ${roleValue}) via SMTP`)
      
      // Use inviteUserByEmail to send invitation email via SMTP
      // This sends an email with a link that allows the user to set their password and verify email
      // Since user was just created with email_confirm: false, inviteUserByEmail should work
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/login?invited=true`,
        data: {
          full_name: full_name,
          role: roleValue,
        }
      })
      
      if (inviteError) {
        console.error(`[Create User] Invite email error for ${roleValue}:`, inviteError.message || inviteError)
        console.error(`[Create User] Error code:`, inviteError.code || 'N/A')
        console.error(`[Create User] Error details:`, JSON.stringify(inviteError, null, 2))
        
        // Fallback: Try to generate signup link and send via email
        console.log(`[Create User] Trying signup link as fallback for ${roleValue}...`)
        const { data: signupLinkData, error: signupLinkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: email,
          options: {
            redirectTo: `${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/login?invited=true`,
            data: {
              full_name: full_name,
              role: roleValue,
            }
          }
        })
        
        if (signupLinkError) {
          console.error(`[Create User] Signup link error for ${roleValue}:`, signupLinkError.message || signupLinkError)
          console.warn('[Create User] ⚠️  Invitation email not sent. Possible reasons:')
          console.warn('[Create User]    1. SMTP is not configured in Supabase')
          console.warn('[Create User]    2. Email service is not properly set up')
          console.warn('[Create User]    3. Invalid email address')
          console.warn('[Create User] ⚠️  User can still login with the password you provided.')
          console.warn('[Create User] ⚠️  To enable emails, configure SMTP in:')
          console.warn('[Create User]    Supabase Dashboard → Project Settings → Authentication → SMTP Settings')
          
          // Since email failed, confirm email manually so user can login
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            email_confirm: true
          }).catch(() => {})
        } else {
          console.log(`[Create User] ✅ Signup link generated for ${roleValue} (email should be sent via SMTP)`)
          if (signupLinkData?.properties?.action_link) {
            console.log(`[Create User] Signup link available for ${roleValue}. Email should be sent automatically via SMTP.`)
          }
          // DO NOT confirm email here - let the user confirm via the link
          // This ensures they must click the invitation link
        }
      } else {
        console.log(`[Create User] ✅ Invitation email sent successfully via SMTP for ${roleValue}`)
        console.log(`[Create User] User will receive an email with a link to set their password and verify their account.`)
        console.log(`[Create User] Email confirmation will happen when user clicks the invitation link.`)
        // DO NOT confirm email immediately - let the invitation link confirm it
        // This ensures the user must actually click the link in the email
      }
    } catch (emailErr) {
      console.error(`[Create User] Email sending exception for ${roleValue}:`, emailErr)
      console.warn('[Create User] ⚠️  Invitation email may not have been sent.')
      console.warn('[Create User] ⚠️  Confirming email manually so user can login.')
      // Confirm email manually if invitation failed
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true
      }).catch(() => {})
      console.warn('[Create User] ⚠️  User can login with the password you provided.')
      console.warn('[Create User] ⚠️  Check Supabase SMTP configuration if emails are required.')
    }

    return res.json({ success: true, userId })
  } catch (err) {
    console.error('[Create User] Route error:', err)
    console.error('[Create User] Stack:', err.stack)
    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      code: 'CREATE_USER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

// Update user profile (admin only)
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const auth = await requireAuth(req, res)
    if (!auth) return
    if (auth.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin required' })
    }
    if (!supabaseAdmin) {
      console.error('[Update User] Service role key not configured')
      return res.status(500).json({ 
        error: 'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in backend/.env file and restart the server.',
        code: 'SERVICE_ROLE_KEY_MISSING'
      })
    }
    const userId = req.params.id
    const { full_name, role } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing user id' })
    const update = {}
    if (typeof full_name === 'string') update.full_name = full_name
    if (typeof role === 'string') update.role = role
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No fields to update' })
    
    console.log(`[Update User] Updating user ${userId} with:`, update)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select()
      .maybeSingle()
    
    if (error) {
      console.error('[Update User] Database error:', error)
      return res.status(400).json({ error: error.message })
    }
    
    // Log admin action
    const { error: logError } = await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: auth.user.id,
        action: 'update_user',
        target_type: 'profile',
        target_id: userId,
        metadata: update,
      })
    if (logError) {
      console.warn('[Update User] Failed to log action:', logError)
    }
    
    return res.json({ success: true, profile: data })
  } catch (err) {
    console.error('[Update User] Route error:', err)
    console.error('[Update User] Stack:', err.stack)
    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      code: 'UPDATE_USER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

// Delete user (admin only)
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const auth = await requireAuth(req, res)
    if (!auth) return
    if (auth.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin required' })
    }
    if (!supabaseAdmin) {
      console.error('[Delete User] Service role key not configured')
      return res.status(500).json({ 
        error: 'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in backend/.env file and restart the server.',
        code: 'SERVICE_ROLE_KEY_MISSING'
      })
    }
    const userId = req.params.id
    if (!userId) return res.status(400).json({ error: 'Missing user id' })
    
    console.log(`[Delete User] Deleting user ${userId}`)
    
    // Log admin action before deletion
    const { error: logError } = await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: auth.user.id,
        action: 'delete_user',
        target_type: 'profile',
        target_id: userId,
        metadata: {},
      })
    if (logError) {
      console.warn('[Delete User] Failed to log action:', logError)
    }
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      console.error('[Delete User] Auth admin error:', error)
      return res.status(400).json({ error: error.message })
    }
    
    return res.json({ success: true })
  } catch (err) {
    console.error('[Delete User] Route error:', err)
    console.error('[Delete User] Stack:', err.stack)
    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      code: 'DELETE_USER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

// Deactivate user account (admin only)
app.post('/api/admin/users/:id/deactivate', async (req, res) => {
  try {
    const auth = await requireAuth(req, res)
    if (!auth) return
    if (auth.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin required' })
    }
    if (!supabaseAdmin) {
      console.error('[Deactivate User] Service role key not configured')
      return res.status(500).json({ 
        error: 'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in backend/.env file and restart the server.',
        code: 'SERVICE_ROLE_KEY_MISSING'
      })
    }
    const userId = req.params.id
    if (!userId) return res.status(400).json({ error: 'Missing user id' })

    console.log(`[Deactivate User] Deactivating user ${userId}`)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)
      .select('id, role, email, full_name, approval_status, is_active')
      .maybeSingle()
    
    if (error) {
      console.error('[Deactivate User] Database error:', error)
      return res.status(400).json({ error: error.message })
    }

    if (!data) {
      console.error(`[Deactivate User] User ${userId} not found`)
      return res.status(404).json({ error: 'User not found' })
    }

    // Log admin action
    const { error: logError } = await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: auth.user.id,
        action: 'deactivate_user',
        target_type: 'profile',
        target_id: userId,
        metadata: { is_active: false },
      })
    if (logError) {
      console.warn('[Deactivate User] Failed to log action:', logError)
    }

    return res.json({ success: true, profile: data })
  } catch (err) {
    console.error('[Deactivate User] Route error:', err)
    console.error('[Deactivate User] Stack:', err.stack)
    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      code: 'DEACTIVATE_USER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

// Activate user account (admin only)
app.post('/api/admin/users/:id/activate', async (req, res) => {
  try {
    const auth = await requireAuth(req, res)
    if (!auth) return
    if (auth.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin required' })
    }
    if (!supabaseAdmin) {
      console.error('[Activate User] Service role key not configured')
      return res.status(500).json({ 
        error: 'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in backend/.env file and restart the server.',
        code: 'SERVICE_ROLE_KEY_MISSING'
      })
    }
    const userId = req.params.id
    if (!userId) return res.status(400).json({ error: 'Missing user id' })

    console.log(`[Activate User] Activating user ${userId}`)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: true, approval_status: 'approved' })
      .eq('id', userId)
      .select('id, role, email, full_name, approval_status, is_active')
      .maybeSingle()
    
    if (error) {
      console.error('[Activate User] Database error:', error)
      return res.status(400).json({ error: error.message })
    }

    if (!data) {
      console.error(`[Activate User] User ${userId} not found`)
      return res.status(404).json({ error: 'User not found' })
    }

    // Log admin action
    const { error: logError } = await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: auth.user.id,
        action: 'activate_user',
        target_type: 'profile',
        target_id: userId,
        metadata: { is_active: true },
      })
    if (logError) {
      console.warn('[Activate User] Failed to log action:', logError)
    }

    return res.json({ success: true, profile: data })
  } catch (err) {
    console.error('[Activate User] Route error:', err)
    console.error('[Activate User] Stack:', err.stack)
    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      code: 'ACTIVATE_USER_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

// Bulk upload students from CSV (university only)
app.post('/api/university/bulk-upload-students', async (req, res) => {
  try {
    const auth = await requireAuth(req, res)
    if (!auth) return
    
    // Verify user is a university
    if (auth.role !== 'university') {
      return res.status(403).json({ error: 'Forbidden: Only universities can upload students' })
    }
    
    if (!supabaseAdmin) {
      console.error('[Bulk Upload] Service role key not configured')
      return res.status(500).json({ 
        error: 'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in backend/.env file and restart the server.',
        code: 'SERVICE_ROLE_KEY_MISSING'
      })
    }

    const { csvText, universityId, bulkUploadId } = req.body || {}
    
    if (!csvText || !universityId || !bulkUploadId) {
      return res.status(400).json({ 
        error: 'Missing required fields: csvText, universityId, and bulkUploadId are required' 
      })
    }

    // Verify universityId matches authenticated user
    if (auth.user.id !== universityId) {
      return res.status(403).json({ error: 'Forbidden: University ID does not match authenticated user' })
    }

    console.log(`[Bulk Upload] Processing CSV for university ${universityId}, bulk upload ${bulkUploadId}`)
    console.log(`[Bulk Upload] CSV text length: ${csvText.length} characters`)
    console.log(`[Bulk Upload] CSV preview (first 200 chars): ${csvText.substring(0, 200)}`)

    // Parse CSV
    const { data: studentsData, error: parseError } = parseCSV(csvText)

    if (parseError) {
      console.error(`[Bulk Upload] CSV parsing error: ${parseError}`)
      // Update bulk upload with error
      try {
        const { error: updateErr } = await supabaseAdmin
          .from('bulk_uploads')
          .update({
            status: 'failed',
            error_log: { error: parseError }
          })
          .eq('id', bulkUploadId)
        if (updateErr) {
          console.error('[Bulk Upload] Failed to update bulk_uploads:', updateErr)
        }
      } catch (updateErr) {
        console.error('[Bulk Upload] Exception updating bulk_uploads:', updateErr)
      }

      return res.status(400).json({ error: parseError })
    }

    if (!studentsData || studentsData.length === 0) {
      try {
        const { error: updateErr } = await supabaseAdmin
          .from('bulk_uploads')
          .update({
            status: 'failed',
            error_log: { error: 'No valid student data found in CSV' }
          })
          .eq('id', bulkUploadId)
        if (updateErr) {
          console.error('[Bulk Upload] Failed to update bulk_uploads:', updateErr)
        }
      } catch (updateErr) {
        console.error('[Bulk Upload] Exception updating bulk_uploads:', updateErr)
      }

      return res.status(400).json({ error: 'No valid student data found in CSV' })
    }

    // Process students
    const results = {
      successful: [],
      failed: [],
      total: studentsData.length
    }

    console.log(`[Bulk Upload] Starting to process ${studentsData.length} students`)

    // Pre-fetch all existing emails once (more efficient)
    console.log('[Bulk Upload] Fetching existing emails...')
    let existingStudents = []
    try {
      const { data, error } = await supabaseAdmin
        .from('students')
        .select('email')
      if (error) {
        console.error('[Bulk Upload] Error fetching existing students:', error)
      } else {
        existingStudents = data || []
      }
    } catch (err) {
      console.error('[Bulk Upload] Exception fetching existing students:', err)
    }
    
    const existingEmails = new Set(
      existingStudents.map(s => s.email?.toLowerCase()).filter(Boolean)
    )
    console.log(`[Bulk Upload] Found ${existingEmails.size} existing student emails`)

    for (let i = 0; i < studentsData.length; i++) {
      const studentData = studentsData[i]
      const studentEmail = studentData.email?.trim().toLowerCase()
      
      console.log(`[Bulk Upload] Processing student ${i + 1}/${studentsData.length}: ${studentEmail}`)
      
      try {
        // Validate student data
        const validation = validateStudentCSV(studentData)
        if (!validation.valid) {
          console.warn(`[Bulk Upload] Validation failed for ${studentEmail}: ${validation.error}`)
          results.failed.push({
            data: studentData,
            error: validation.error
          })
          continue
        }

        // Check if email exists in students table (using pre-fetched set)
        if (existingEmails.has(studentEmail)) {
          console.warn(`[Bulk Upload] Email already exists: ${studentEmail}`)
          results.failed.push({
            data: studentData,
            error: 'Email already exists in students table'
          })
          continue
        }

        // Note: We'll check auth.users by attempting to create the user
        // If creation fails with "user already exists", we'll catch it below

        // Generate password
        const tempPassword = generatePassword(12)

        // Create auth user
        console.log(`[Bulk Upload] Creating auth user for ${studentEmail}`)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: studentEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            full_name: studentData.name.trim()
          }
        })

        if (authError) {
          console.error(`[Bulk Upload] Auth user creation failed for ${studentEmail}:`, authError)
          // Check if error is due to existing user
          const errorMsg = authError.message?.toLowerCase() || ''
          if (errorMsg.includes('already exists') || errorMsg.includes('user already registered') || errorMsg.includes('already been registered')) {
            results.failed.push({
              data: studentData,
              error: 'Email already exists in system'
            })
          } else {
            results.failed.push({
              data: studentData,
              error: authError.message
            })
          }
          continue
        }

        if (!authData?.user?.id) {
          console.error(`[Bulk Upload] No user ID returned for ${studentEmail}`)
          results.failed.push({
            data: studentData,
            error: 'Failed to create auth user: no user ID returned'
          })
          continue
        }

        console.log(`[Bulk Upload] Auth user created: ${authData.user.id} for ${studentEmail}`)

        // Create student record
        const studentPayload = {
          user_id: authData.user.id,
          university_id: universityId,
          name: studentData.name.trim(),
          email: studentEmail,
          student_id: studentData.student_id.trim(),
          batch: studentData.batch ? parseInt(studentData.batch) : null,
          degree_program: studentData.degree_program ? studentData.degree_program.trim() : null,
          semester: studentData.semester ? parseInt(studentData.semester) : null,
          credentials: {
            password: tempPassword,
            generated_at: new Date().toISOString()
          }
        }

        console.log(`[Bulk Upload] Creating student record for ${studentEmail}`)
        const { data: student, error: studentError } = await supabaseAdmin
          .from('students')
          .insert(studentPayload)
          .select()
          .single()

        if (studentError) {
          console.error(`[Bulk Upload] Student record creation failed for ${studentEmail}:`, studentError)
          // Rollback: delete auth user
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {
            console.warn(`[Bulk Upload] Failed to rollback auth user ${authData.user.id}`)
          })
          results.failed.push({
            data: studentData,
            error: studentError.message
          })
          continue
        }

        console.log(`[Bulk Upload] Student record created: ${student.id} for ${studentEmail}`)
        
        // Add to existing emails set to prevent duplicates in same batch
        existingEmails.add(studentEmail)

        // Ensure profile exists and update with university_id
        console.log(`[Bulk Upload] Ensuring profile exists for user ${authData.user.id}`)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({ 
            id: authData.user.id,
            role: 'student',
            email: studentEmail,
            university_id: universityId,
            full_name: studentData.name.trim()
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error(`[Bulk Upload] Failed to create/update profile for user ${authData.user.id}:`, profileError)
          // This is critical - if profile creation fails, we should rollback
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {
            console.warn(`[Bulk Upload] Failed to rollback auth user ${authData.user.id}`)
          })
          await supabaseAdmin.from('students').delete().eq('user_id', authData.user.id).catch(() => {})
          results.failed.push({
            data: studentData,
            error: `Profile creation failed: ${profileError.message}`
          })
          continue
        } else {
          console.log(`[Bulk Upload] Profile created/updated for user ${authData.user.id}`)
        }

        results.successful.push({
          student,
          credentials: {
            email: studentEmail,
            password: tempPassword
          }
        })
        
        console.log(`[Bulk Upload] ✅ Successfully processed student ${i + 1}/${studentsData.length}: ${studentEmail}`)
      } catch (error) {
        console.error(`[Bulk Upload] ❌ Error processing student ${i + 1}/${studentsData.length} (${studentEmail}):`, error)
        console.error('[Bulk Upload] Error stack:', error.stack)
        results.failed.push({
          data: studentData,
          error: error.message || 'Unknown error'
        })
      }
    }

    // Update bulk upload record
    try {
      const { error: updateErr } = await supabaseAdmin
        .from('bulk_uploads')
        .update({
          status: results.failed.length === 0 ? 'completed' : 'completed',
          successful_records: results.successful.length,
          failed_records: results.failed.length,
          error_log: results.failed.length > 0 ? {
            errors: results.failed
          } : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', bulkUploadId)
      if (updateErr) {
        console.error('[Bulk Upload] Failed to update bulk_uploads:', updateErr)
      }
    } catch (updateErr) {
      console.error('[Bulk Upload] Exception updating bulk_uploads:', updateErr)
    }

    console.log(`[Bulk Upload] Completed: ${results.successful.length} successful, ${results.failed.length} failed`)

    const responseData = {
      success: true,
      results: {
        successful: results.successful.length,
        failed: results.failed.length,
        total: results.total,
        errors: results.failed.length > 0 ? results.failed : null
      }
    }
    
    console.log('[Bulk Upload] Sending response:', JSON.stringify(responseData, null, 2))
    
    return res.status(200).json(responseData)
  } catch (err) {
    console.error('[Bulk Upload] Route error:', err)
    console.error('[Bulk Upload] Stack:', err.stack)
    
    // Try to update bulk_uploads with error
    if (req.body?.bulkUploadId && supabaseAdmin) {
      try {
        const { error: updateErr } = await supabaseAdmin
          .from('bulk_uploads')
          .update({
            status: 'failed',
            error_log: { error: err.message }
          })
          .eq('id', req.body.bulkUploadId)
        if (updateErr) {
          console.error('[Bulk Upload] Failed to update bulk_uploads:', updateErr)
        }
      } catch (updateErr) {
        console.error('[Bulk Upload] Exception updating bulk_uploads:', updateErr)
      }
    }

    return res.status(500).json({ 
      error: err.message || 'Internal server error',
      code: 'BULK_UPLOAD_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})