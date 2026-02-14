// ============================================
// Application Status Tracking Service (FR-06, UC-06)
// Handles real-time application status tracking
// ============================================

import { supabase } from '../config/supabase.js';

/**
 * Get application statuses for a user
 * @param {object} filters - Filter options (status, internship title, etc.)
 * @returns {Promise<object>} - List of applications with statuses
 */
export const getUserApplicationStatuses = async (filters = {}) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        let query = supabase
            .from('applications')
            .select(`
                id,
                status,
                applied_at,
                updated_at,
                feedback,
                internships:internship_id (
                    id,
                    title,
                    description,
                    skills,
                    duration,
                    location,
                    profiles:software_house_id (
                        organization_name
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('applied_at', { ascending: false });

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.internship_title) {
            query = query.ilike('internships.title', `%${filters.internship_title}%`);
        }

        const { data: applications, error } = await query;

        if (error) throw error;

        return { applications: applications || [], error: null };
    } catch (error) {
        console.error('Get user application statuses error:', error);
        return { applications: null, error: error.message };
    }
};

/**
 * Get application statuses for university's students
 * @param {string} universityId - University ID
 * @param {object} filters - Filter options
 * @returns {Promise<object>} - List of student applications
 */
export const getUniversityStudentStatuses = async (universityId, filters = {}) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is the university
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'university' || profile?.id !== universityId) {
            throw new Error('Unauthorized: Can only view own students\' applications');
        }

        // Use the view for better performance
        let query = supabase
            .from('university_student_applications')
            .select('*')
            .eq('university_id', universityId)
            .order('applied_at', { ascending: false });

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.student_name) {
            query = query.ilike('student_name', `%${filters.student_name}%`);
        }

        if (filters.internship_title) {
            query = query.ilike('internship_title', `%${filters.internship_title}%`);
        }

        const { data: applications, error } = await query;

        if (error) throw error;

        return { applications: applications || [], error: null };
    } catch (error) {
        console.error('Get university student statuses error:', error);
        return { applications: null, error: error.message };
    }
};

/**
 * Get application tracking view (detailed)
 * @param {object} filters - Filter options
 * @returns {Promise<object>} - List of application tracking records
 */
export const getApplicationTracking = async (filters = {}) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        let query = supabase
            .from('application_tracking')
            .select('*')
            .order('applied_at', { ascending: false });

        // Apply filters
        if (filters.user_id) {
            query = query.eq('user_id', filters.user_id);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.internship_id) {
            query = query.eq('internship_id', filters.internship_id);
        }

        const { data: tracking, error } = await query;

        if (error) throw error;

        return { tracking: tracking || [], error: null };
    } catch (error) {
        console.error('Get application tracking error:', error);
        return { tracking: null, error: error.message };
    }
};

/**
 * Get application statistics for a user
 * @returns {Promise<object>} - Application statistics
 */
export const getUserApplicationStats = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        const { data: applications, error } = await supabase
            .from('applications')
            .select('status')
            .eq('user_id', user.id);

        if (error) throw error;

        const stats = {
            total: applications?.length || 0,
            pending: applications?.filter(a => a.status === 'pending').length || 0,
            accepted: applications?.filter(a => a.status === 'accepted').length || 0,
            rejected: applications?.filter(a => a.status === 'rejected').length || 0
        };

        return { stats, error: null };
    } catch (error) {
        console.error('Get user application stats error:', error);
        return { stats: null, error: error.message };
    }
};

/**
 * Subscribe to application status changes (realtime)
 * @param {string} userId - User ID to track
 * @param {function} callback - Callback function for status updates
 * @returns {object} - Subscription object
 */
export const subscribeToApplicationStatus = (userId, callback) => {
    const subscription = supabase
        .channel('application_status')
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'applications',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                callback({
                    applicationId: payload.new.id,
                    oldStatus: payload.old.status,
                    newStatus: payload.new.status,
                    updatedAt: payload.new.updated_at,
                    feedback: payload.new.feedback
                });
            }
        )
        .subscribe();

    return subscription;
};

/**
 * Subscribe to all application statuses for university (realtime)
 * @param {string} universityId - University ID
 * @param {function} callback - Callback function for status updates
 * @returns {object} - Subscription object
 */
export const subscribeToUniversityApplicationStatus = (universityId, callback) => {
    // Get all student user IDs for this university
    const getStudentUserIds = async () => {
        const { data: students } = await supabase
            .from('students')
            .select('user_id')
            .eq('university_id', universityId);

        return students?.map(s => s.user_id) || [];
    };

    // Subscribe to changes for all students
    const subscription = supabase
        .channel('university_application_status')
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'applications'
            },
            async (payload) => {
                // Check if this application belongs to a student from this university
                const studentIds = await getStudentUserIds();
                if (studentIds.includes(payload.new.user_id)) {
                    callback({
                        applicationId: payload.new.id,
                        userId: payload.new.user_id,
                        oldStatus: payload.old.status,
                        newStatus: payload.new.status,
                        updatedAt: payload.new.updated_at
                    });
                }
            }
        )
        .subscribe();

    return subscription;
};

