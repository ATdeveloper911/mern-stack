import { supabase } from './supabase'

/**
 * Calculate date range based on filter option
 */
function getDateRange(filter = '6months') {
  const now = new Date()
  let startDate = new Date()

  switch (filter) {
    case '7days':
      startDate.setDate(now.getDate() - 7)
      break
    case '30days':
      startDate.setDate(now.getDate() - 30)
      break
    case '6months':
      startDate.setMonth(now.getMonth() - 6)
      break
    case '1year':
      startDate.setFullYear(now.getFullYear() - 1)
      break
    case 'all':
    default:
      startDate = null // No filter
      break
  }

  return startDate ? startDate.toISOString() : null
}

/**
 * Group data by month for trend charts
 */
function groupByMonth(data, dateField = 'created_at') {
  const monthMap = {}
  const now = new Date()
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleString('default', { month: 'short' })
    monthMap[key] = { month: key, label, count: 0 }
  }

  // Count data per month
  data.forEach(item => {
    if (!item[dateField]) return
    const date = new Date(item[dateField])
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (monthMap[key]) {
      monthMap[key].count++
    }
  })

  return Object.values(monthMap)
}

/**
 * Fetch user analytics
 */
export async function fetchUserAnalytics(dateFilter = '6months') {
  const dateRange = getDateRange(dateFilter)
  
  // Fetch all profiles
  let query = supabase.from('profiles').select('id, role, created_at, is_active, approval_status')
  
  if (dateRange) {
    query = query.gte('created_at', dateRange)
  }

  const { data: profiles, error } = await query.order('created_at', { ascending: true })

  if (error) throw error

  // Calculate metrics
  const totalUsers = profiles?.length || 0
  const roleDistribution = {}
  const statusDistribution = { active: 0, inactive: 0, approved: 0, pending: 0, rejected: 0 }
  const growthByRole = {}

  profiles?.forEach(profile => {
    // Role distribution
    roleDistribution[profile.role] = (roleDistribution[profile.role] || 0) + 1

    // Status distribution
    if (profile.is_active) statusDistribution.active++
    else statusDistribution.inactive++
    
    if (profile.approval_status === 'approved') statusDistribution.approved++
    else if (profile.approval_status === 'pending') statusDistribution.pending++
    else if (profile.approval_status === 'rejected') statusDistribution.rejected++

    // Growth by role over time
    if (!growthByRole[profile.role]) {
      growthByRole[profile.role] = []
    }
    growthByRole[profile.role].push(profile)
  })

  // User growth trend
  const growthTrend = groupByMonth(profiles || [], 'created_at')

  // Growth by role (grouped by month)
  const roleGrowthData = {}
  Object.keys(growthByRole).forEach(role => {
    roleGrowthData[role] = groupByMonth(growthByRole[role], 'created_at')
  })

  // Top universities by student count
  const { data: students } = await supabase
    .from('students')
    .select('university_id, profiles:university_id(organization_name, full_name)')
  
  const universityCounts = {}
  students?.forEach(student => {
    const uniId = student.university_id
    if (!universityCounts[uniId]) {
      universityCounts[uniId] = {
        id: uniId,
        name: student.profiles?.organization_name || student.profiles?.full_name || 'Unknown',
        count: 0
      }
    }
    universityCounts[uniId].count++
  })

  const topUniversities = Object.values(universityCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Calculate growth percentage (compare last month to previous month)
  const lastMonth = growthTrend[growthTrend.length - 1]?.count || 0
  const previousMonth = growthTrend[growthTrend.length - 2]?.count || 0
  const growthPercentage = previousMonth > 0 
    ? Math.round(((lastMonth - previousMonth) / previousMonth) * 100) 
    : 0

  // Get pending approvals count
  const { count: pendingUserCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['guest', 'university', 'software_house'])
    .eq('approval_status', 'pending')

  const { count: pendingInternshipCount } = await supabase
    .from('internships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const pendingApprovals = (pendingUserCount || 0) + (pendingInternshipCount || 0)

  return {
    totalUsers,
    growthPercentage,
    roleDistribution,
    statusDistribution,
    growthTrend,
    roleGrowthData,
    topUniversities,
    pendingApprovals
  }
}

/**
 * Fetch internship analytics
 */
export async function fetchInternshipAnalytics(dateFilter = '6months') {
  const dateRange = getDateRange(dateFilter)

  let query = supabase
    .from('internships')
    .select('id, status, created_at, approved_at, software_house_id, profiles:software_house_id(organization_name, full_name)')
  
  if (dateRange) {
    query = query.gte('created_at', dateRange)
  }

  const { data: internships, error } = await query.order('created_at', { ascending: true })

  if (error) throw error

  // Calculate metrics
  const totalInternships = internships?.length || 0
  const statusCounts = { pending: 0, approved: 0, rejected: 0 }
  const approvalTimes = []

  internships?.forEach(internship => {
    statusCounts[internship.status] = (statusCounts[internship.status] || 0) + 1

    // Calculate approval time
    if (internship.approved_at && internship.created_at) {
      const created = new Date(internship.created_at)
      const approved = new Date(internship.approved_at)
      const hours = (approved - created) / (1000 * 60 * 60)
      if (hours > 0) approvalTimes.push(hours)
    }
  })

  const approvalRate = totalInternships > 0 
    ? Math.round((statusCounts.approved / totalInternships) * 100) 
    : 0

  const avgApprovalTime = approvalTimes.length > 0
    ? Math.round(approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length)
    : 0

  // Internship trends
  const trends = groupByMonth(internships || [], 'created_at')

  // Internships by software house
  const softwareHouseCounts = {}
  internships?.forEach(internship => {
    const shId = internship.software_house_id
    if (!softwareHouseCounts[shId]) {
      softwareHouseCounts[shId] = {
        id: shId,
        name: internship.profiles?.organization_name || internship.profiles?.full_name || 'Unknown',
        count: 0
      }
    }
    softwareHouseCounts[shId].count++
  })

  const topSoftwareHouses = Object.values(softwareHouseCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalInternships,
    statusCounts,
    approvalRate,
    avgApprovalTime,
    trends,
    topSoftwareHouses
  }
}

/**
 * Fetch application analytics
 */
export async function fetchApplicationAnalytics(dateFilter = '6months') {
  const dateRange = getDateRange(dateFilter)

  let query = supabase
    .from('applications')
    .select(`
      id,
      status,
      applied_at,
      updated_at,
      user_id,
      internship_id,
      profiles:user_id(role),
      internships:internship_id(title)
    `)
  
  if (dateRange) {
    query = query.gte('applied_at', dateRange)
  }

  const { data: applications, error } = await query.order('applied_at', { ascending: true })

  if (error) throw error

  // Calculate metrics
  const totalApplications = applications?.length || 0
  const statusCounts = { pending: 0, accepted: 0, rejected: 0 }
  const roleCounts = { student: 0, guest: 0 }
  const responseTimes = []
  const internshipCounts = {}

  applications?.forEach(application => {
    statusCounts[application.status] = (statusCounts[application.status] || 0) + 1

    // Count by role
    const role = application.profiles?.role
    if (role === 'student') roleCounts.student++
    else if (role === 'guest') roleCounts.guest++

    // Calculate response time
    if (application.updated_at && application.applied_at && application.status !== 'pending') {
      const applied = new Date(application.applied_at)
      const updated = new Date(application.updated_at)
      const hours = (updated - applied) / (1000 * 60 * 60)
      if (hours > 0) responseTimes.push(hours)
    }

    // Count by internship
    const internshipId = application.internship_id
    if (!internshipCounts[internshipId]) {
      internshipCounts[internshipId] = {
        id: internshipId,
        title: application.internships?.title || 'Unknown',
        count: 0
      }
    }
    internshipCounts[internshipId].count++
  })

  const acceptanceRate = totalApplications > 0
    ? Math.round((statusCounts.accepted / totalApplications) * 100)
    : 0

  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0

  // Application trends
  const trends = groupByMonth(applications || [], 'applied_at')

  // Top internships by applications
  const topInternships = Object.values(internshipCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalApplications,
    statusCounts,
    acceptanceRate,
    roleCounts,
    avgResponseTime,
    trends,
    topInternships
  }
}

/**
 * Fetch activity analytics
 */
export async function fetchActivityAnalytics(dateFilter = '6months') {
  const dateRange = getDateRange(dateFilter)

  // Try activity_logs first, fallback to admin_logs
  let query = supabase.from('activity_logs').select('id, actor_id, role, action, target_type, timestamp, profiles:actor_id(full_name, organization_name, email)')
  
  if (dateRange) {
    query = query.gte('timestamp', dateRange)
  }

  const { data: activities, error } = await query.order('timestamp', { ascending: false }).limit(1000)

  // If activity_logs fails, try admin_logs
  let finalActivities = activities
  if (error || !activities || activities.length === 0) {
    let adminQuery = supabase.from('admin_logs').select('id, admin_id as actor_id, action, target_type, timestamp, profiles:admin_id(full_name, organization_name, email)')
    if (dateRange) {
      adminQuery = adminQuery.gte('timestamp', dateRange)
    }
    const { data: adminActivities } = await adminQuery.order('timestamp', { ascending: false }).limit(1000)
    finalActivities = (adminActivities || []).map(a => ({ ...a, role: 'admin' }))
  }

  // Calculate metrics
  const totalActivities = finalActivities?.length || 0
  const actionCounts = {}
  const roleCounts = {}
  const userActivityCounts = {}

  finalActivities?.forEach(activity => {
    // Action type distribution
    actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1

    // Activity by role
    const role = activity.role || 'admin'
    roleCounts[role] = (roleCounts[role] || 0) + 1

    // User activity counts
    const userId = activity.actor_id
    if (userId) {
      if (!userActivityCounts[userId]) {
        userActivityCounts[userId] = {
          id: userId,
          name: activity.profiles?.full_name || activity.profiles?.organization_name || activity.profiles?.email || 'Unknown',
          count: 0
        }
      }
      userActivityCounts[userId].count++
    }
  })

  // Activity timeline
  const activityTrend = groupByMonth(finalActivities || [], 'timestamp')

  // Activity by role over time (for stacked area chart)
  const roleActivityTrend = {}
  Object.keys(roleCounts).forEach(role => {
    const roleActivities = finalActivities?.filter(a => (a.role || 'admin') === role) || []
    roleActivityTrend[role] = groupByMonth(roleActivities, 'timestamp')
  })

  // Top active users
  const topActiveUsers = Object.values(userActivityCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalActivities,
    actionCounts,
    roleCounts,
    activityTrend,
    roleActivityTrend,
    topActiveUsers
  }
}

/**
 * Fetch performance metrics
 */
export async function fetchPerformanceMetrics(dateFilter = '6months') {
  const dateRange = getDateRange(dateFilter)

  // Fetch profiles for approval times
  let profilesQuery = supabase
    .from('profiles')
    .select('id, created_at, updated_at, approval_status, role')
    .in('role', ['guest', 'software_house', 'university'])
  
  if (dateRange) {
    profilesQuery = profilesQuery.gte('created_at', dateRange)
  }

  const { data: profiles } = await profilesQuery

  // Fetch internships for approval times
  let internshipsQuery = supabase
    .from('internships')
    .select('id, created_at, approved_at, status')
  
  if (dateRange) {
    internshipsQuery = internshipsQuery.gte('created_at', dateRange)
  }

  const { data: internships } = await internshipsQuery

  // Calculate approval processing times
  const userApprovalTimes = []
  const internshipApprovalTimes = []

  profiles?.forEach(profile => {
    if (profile.approval_status === 'approved' && profile.updated_at && profile.created_at) {
      const created = new Date(profile.created_at)
      const updated = new Date(profile.updated_at)
      const hours = (updated - created) / (1000 * 60 * 60)
      if (hours > 0) userApprovalTimes.push(hours)
    }
  })

  internships?.forEach(internship => {
    if (internship.approved_at && internship.created_at) {
      const created = new Date(internship.created_at)
      const approved = new Date(internship.approved_at)
      const hours = (approved - created) / (1000 * 60 * 60)
      if (hours > 0) internshipApprovalTimes.push(hours)
    }
  })

  const avgUserApprovalTime = userApprovalTimes.length > 0
    ? Math.round(userApprovalTimes.reduce((a, b) => a + b, 0) / userApprovalTimes.length)
    : 0

  const avgInternshipApprovalTime = internshipApprovalTimes.length > 0
    ? Math.round(internshipApprovalTimes.reduce((a, b) => a + b, 0) / internshipApprovalTimes.length)
    : 0

  // Engagement rate (active users / total users)
  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const engagementRate = totalUsers > 0
    ? Math.round((activeUsers / totalUsers) * 100)
    : 0

  // Conversion metrics
  const { count: approvedUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'approved')

  const conversionRate = totalUsers > 0
    ? Math.round((approvedUsers / totalUsers) * 100)
    : 0

  // Platform health score (composite metric)
  // Based on: engagement rate, conversion rate, approval times
  const healthScore = Math.round(
    (engagementRate * 0.4) + 
    (conversionRate * 0.3) + 
    (Math.max(0, 100 - (avgUserApprovalTime / 24)) * 0.3)
  )

  return {
    avgUserApprovalTime,
    avgInternshipApprovalTime,
    engagementRate,
    conversionRate,
    healthScore
  }
}

/**
 * Fetch role-specific insights
 */
export async function fetchRoleSpecificInsights(dateFilter = '6months') {
  const dateRange = getDateRange(dateFilter)

  // Student insights
  const { data: studentProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')

  const studentIds = studentProfiles?.map(p => p.id) || []

  let studentAppsQuery = supabase
    .from('applications')
    .select('id, status, user_id')
    .in('user_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
  
  if (dateRange) {
    studentAppsQuery = studentAppsQuery.gte('applied_at', dateRange)
  }

  const { data: studentApps } = await studentAppsQuery

  const { data: studentCVs } = await supabase
    .from('cv_forms')
    .select('id, is_complete, user_id')
    .in('user_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])

  const studentStats = {
    total: studentIds.length,
    applicationsSubmitted: studentApps?.length || 0,
    applicationsAccepted: studentApps?.filter(a => a.status === 'accepted').length || 0,
    cvCompletionRate: studentCVs?.length > 0
      ? Math.round((studentCVs.filter(cv => cv.is_complete).length / studentCVs.length) * 100)
      : 0
  }

  // Software House insights
  const { data: shProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'software_house')

  const shIds = shProfiles?.map(p => p.id) || []

  let shInternshipsQuery = supabase
    .from('internships')
    .select('id, status, software_house_id')
    .in('software_house_id', shIds.length > 0 ? shIds : ['00000000-0000-0000-0000-000000000000'])
  
  if (dateRange) {
    shInternshipsQuery = shInternshipsQuery.gte('created_at', dateRange)
  }

  const { data: shInternships } = await shInternshipsQuery

  // Fetch applications for software house internships
  let shApplications = []
  if (shInternships && shInternships.length > 0) {
    const internshipIds = shInternships.map(i => i.id)
    const { data: apps } = await supabase
      .from('applications')
      .select('id, internship_id')
      .in('internship_id', internshipIds)
    shApplications = apps || []
  }

  const shStats = {
    total: shIds.length,
    internshipsPosted: shInternships?.length || 0,
    internshipsApproved: shInternships?.filter(i => i.status === 'approved').length || 0,
    applicationsReceived: shApplications?.length || 0
  }

  // University insights
  const { data: uniProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'university')

  const uniIds = uniProfiles?.map(p => p.id) || []

  const { data: uniStudents } = await supabase
    .from('students')
    .select('id, university_id')
    .in('university_id', uniIds.length > 0 ? uniIds : ['00000000-0000-0000-0000-000000000000'])

  const studentUserIds = uniStudents?.map(s => s.user_id) || []
  const { data: uniStudentApps } = await supabase
    .from('applications')
    .select('id, status, user_id')
    .in('user_id', studentUserIds.length > 0 ? studentUserIds : ['00000000-0000-0000-0000-000000000000'])

  const uniStats = {
    total: uniIds.length,
    studentsRegistered: uniStudents?.length || 0,
    studentApplicationRate: uniStudents?.length > 0
      ? Math.round((uniStudentApps?.length || 0) / uniStudents.length * 100)
      : 0
  }

  // Guest insights
  const { data: guestProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'guest')

  const guestIds = guestProfiles?.map(p => p.id) || []

  const { data: guestApps } = await supabase
    .from('applications')
    .select('id, status, user_id')
    .in('user_id', guestIds.length > 0 ? guestIds : ['00000000-0000-0000-0000-000000000000'])

  const { data: convertedGuests } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .in('id', guestIds.length > 0 ? guestIds : ['00000000-0000-0000-0000-000000000000'])

  const guestStats = {
    total: guestIds.length,
    applicationsSubmitted: guestApps?.length || 0,
    conversionToStudent: convertedGuests?.length || 0
  }

  return {
    student: studentStats,
    softwareHouse: shStats,
    university: uniStats,
    guest: guestStats
  }
}

