// ============================================
// Application Service (FR-04, UC-04)
// Handles internship applications using CV form data
// ============================================

import { supabase } from '../config/supabase.js';
import { isCVComplete } from './cvService.js';

/**
 * Apply for an internship
 * @param {string} internshipId - Internship ID
 * @returns {Promise<object>} - Created application
 */
export const applyForInternship = async (internshipId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is student or guest
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'student' && profile?.role !== 'guest') {
            throw new Error('Only students and guest users can apply for internships');
        }

        // Check if CV form is complete
        const cvCheck = await isCVComplete(user.id);
        if (!cvCheck.isComplete) {
            throw new Error('Please complete your CV Form before applying');
        }

        // Check if internship exists and is approved
        const { data: internship } = await supabase
            .from('internships')
            .select('id, status')
            .eq('id', internshipId)
            .single();

        if (!internship) {
            throw new Error('Internship not found');
        }

        if (internship.status !== 'approved') {
            throw new Error('This internship is not available for applications');
        }

        // Check if already applied
        const { data: existing } = await supabase
            .from('applications')
            .select('id')
            .eq('user_id', user.id)
            .eq('internship_id', internshipId)
            .single();

        if (existing) {
            throw new Error('You have already applied for this internship');
        }

        // Get CV form data
        const { data: cvForm } = await supabase
            .from('cv_forms')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Create application
        const { data: application, error } = await supabase
            .from('applications')
            .insert({
                user_id: user.id,
                internship_id: internshipId,
                status: 'pending',
                cv_data: {
                    personal: cvForm.personal,
                    education: cvForm.education,
                    skills: cvForm.skills,
                    experience: cvForm.experience,
                    projects: cvForm.projects,
                    certifications: cvForm.certifications,
                    languages: cvForm.languages
                }
            })
            .select()
            .single();

        if (error) {
            // Check if it's a unique constraint violation
            if (error.code === '23505') {
                throw new Error('You have already applied for this internship');
            }
            throw error;
        }

        return { application, error: null };
    } catch (error) {
        console.error('Apply for internship error:', error);
        return { application: null, error: error.message };
    }
};

/**
 * Get user's applications
 * @param {object} filters - Filter options (status, etc.)
 * @returns {Promise<object>} - List of applications
 */
export const getUserApplications = async (filters = {}) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        let query = supabase
            .from('applications')
            .select(`
                *,
                internships:internship_id (
                    id,
                    title,
                    description,
                    skills,
                    duration,
                    location,
                    stipend,
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

        const { data: applications, error } = await query;

        if (error) throw error;

        return { applications, error: null };
    } catch (error) {
        console.error('Get user applications error:', error);
        return { applications: null, error: error.message };
    }
};

/**
 * Get applications for an internship (software house view)
 * @param {string} internshipId - Internship ID
 * @returns {Promise<object>} - List of applications
 */
export const getInternshipApplications = async (internshipId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user owns the internship
        const { data: internship } = await supabase
            .from('internships')
            .select('software_house_id')
            .eq('id', internshipId)
            .single();

        if (!internship) {
            throw new Error('Internship not found');
        }

        if (internship.software_house_id !== user.id) {
            throw new Error('Unauthorized: Can only view applications for own internships');
        }

        const { data: applications, error } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    email
                )
            `)
            .eq('internship_id', internshipId)
            .order('applied_at', { ascending: false });

        if (error) throw error;

        return { applications, error: null };
    } catch (error) {
        console.error('Get internship applications error:', error);
        return { applications: null, error: error.message };
    }
};

/**
 * Update application status (software house)
 * @param {string} applicationId - Application ID
 * @param {string} status - New status (accepted/rejected)
 * @param {string} feedback - Optional feedback
 * @returns {Promise<object>} - Updated application
 */
export const updateApplicationStatus = async (applicationId, status, feedback = null) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Validate status
        if (!['accepted', 'rejected'].includes(status)) {
            throw new Error('Invalid status. Must be "accepted" or "rejected"');
        }

        // Get application and verify ownership
        const { data: application } = await supabase
            .from('applications')
            .select(`
                *,
                internships:internship_id (
                    software_house_id
                )
            `)
            .eq('id', applicationId)
            .single();

        if (!application) {
            throw new Error('Application not found');
        }

        if (application.internships.software_house_id !== user.id) {
            throw new Error('Unauthorized: Can only update applications for own internships');
        }

        // Update application
        const { data: updatedApplication, error } = await supabase
            .from('applications')
            .update({
                status,
                feedback,
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId)
            .select()
            .single();

        if (error) throw error;

        return { application: updatedApplication, error: null };
    } catch (error) {
        console.error('Update application status error:', error);
        return { application: null, error: error.message };
    }
};

/**
 * Get application by ID
 * @param {string} applicationId - Application ID
 * @returns {Promise<object>} - Application data
 */
export const getApplicationById = async (applicationId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        const { data: application, error } = await supabase
            .from('applications')
            .select(`
                *,
                internships:internship_id (
                    *,
                    profiles:software_house_id (
                        organization_name
                    )
                ),
                profiles:user_id (
                    full_name,
                    email
                )
            `)
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        // Verify access
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const canView = 
            application.user_id === user.id || // Applicant
            application.internships.software_house_id === user.id || // Software house
            profile?.role === 'admin' || // Admin
            profile?.role === 'university'; // University (for their students)

        if (!canView) {
            throw new Error('Unauthorized: Cannot view this application');
        }

        return { application, error: null };
    } catch (error) {
        console.error('Get application error:', error);
        return { application: null, error: error.message };
    }
};

/**
 * Subscribe to application status changes (realtime)
 * @param {string} userId - User ID to subscribe to
 * @param {function} callback - Callback function for updates
 * @returns {object} - Subscription object
 */
export const subscribeToApplications = (userId, callback) => {
    const subscription = supabase
        .channel('applications')
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'applications',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return subscription;
};

