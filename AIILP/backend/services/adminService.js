// ============================================
// Admin Management Service (FR-07, UC-07)
// Handles admin operations: approvals, rejections, platform management
// ============================================

import { supabase } from '../config/supabase.js';

/**
 * Get all pending items for admin dashboard
 * @returns {Promise<object>} - Pending items counts and lists
 */
export const getPendingItems = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        // Get pending internships
        const { data: pendingInternships, error: internshipsError } = await supabase
            .from('internships')
            .select(`
                *,
                profiles:software_house_id (
                    id,
                    organization_name,
                    full_name
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (internshipsError) throw internshipsError;

        // Get pending software houses
        const { data: pendingSoftwareHouses, error: softwareHousesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'software_house')
            .eq('approval_status', 'pending')
            .order('created_at', { ascending: false });

        if (softwareHousesError) throw softwareHousesError;

        // Get pending guests
        const { data: pendingGuests, error: guestsError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'guest')
            .eq('approval_status', 'pending')
            .order('created_at', { ascending: false });

        if (guestsError) throw guestsError;

        // Get counts using database function
        const { data: counts, error: countsError } = await supabase.rpc('get_pending_counts');

        return {
            pending: {
                internships: pendingInternships || [],
                softwareHouses: pendingSoftwareHouses || [],
                guests: pendingGuests || [],
                counts: counts || {
                    internships: pendingInternships?.length || 0,
                    software_houses: pendingSoftwareHouses?.length || 0,
                    guests: pendingGuests?.length || 0
                }
            },
            error: null
        };
    } catch (error) {
        console.error('Get pending items error:', error);
        return {
            pending: null,
            error: error.message
        };
    }
};

/**
 * Approve or reject an internship
 * @param {string} internshipId - Internship ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} feedback - Optional feedback
 * @returns {Promise<object>} - Updated internship
 */
export const reviewInternship = async (internshipId, action, feedback = null) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        if (!['approve', 'reject'].includes(action)) {
            throw new Error('Invalid action. Must be "approve" or "reject"');
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        const updateData = {
            status,
            feedback,
            updated_at: new Date().toISOString()
        };

        if (action === 'approve') {
            updateData.approved_at = new Date().toISOString();
        }

        const { data: internship, error } = await supabase
            .from('internships')
            .update(updateData)
            .eq('id', internshipId)
            .select()
            .single();

        if (error) throw error;

        // Log admin action (trigger handles this, but we can also do it explicitly)
        await supabase
            .from('admin_logs')
            .insert({
                admin_id: user.id,
                action: `${action}_internship`,
                target_type: 'internship',
                target_id: internshipId,
                feedback,
                metadata: {
                    status: internship.status
                }
            });

        return { internship, error: null };
    } catch (error) {
        console.error('Review internship error:', error);
        return { internship: null, error: error.message };
    }
};

/**
 * Approve or reject a software house account
 * @param {string} profileId - Profile ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} feedback - Optional feedback
 * @returns {Promise<object>} - Updated profile
 */
export const reviewSoftwareHouse = async (profileId, action, feedback = null) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        if (!['approve', 'reject'].includes(action)) {
            throw new Error('Invalid action. Must be "approve" or "reject"');
        }

        // Verify target is a software house
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', profileId)
            .single();

        if (targetProfile?.role !== 'software_house') {
            throw new Error('Target profile is not a software house');
        }

        const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
        const isActive = action === 'approve';

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                approval_status: approvalStatus,
                is_active: isActive
            })
            .eq('id', profileId)
            .select()
            .single();

        if (error) throw error;

        // Log admin action
        await supabase
            .from('admin_logs')
            .insert({
                admin_id: user.id,
                action: `${action}_software_house`,
                target_type: 'profile',
                target_id: profileId,
                feedback,
                metadata: {
                    approval_status: approvalStatus
                }
            });

        return { profile: updatedProfile, error: null };
    } catch (error) {
        console.error('Review software house error:', error);
        return { profile: null, error: error.message };
    }
};

/**
 * Approve or reject a guest account
 * @param {string} profileId - Profile ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} feedback - Optional feedback
 * @returns {Promise<object>} - Updated profile
 */
export const reviewGuest = async (profileId, action, feedback = null) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        if (!['approve', 'reject'].includes(action)) {
            throw new Error('Invalid action. Must be "approve" or "reject"');
        }

        // Verify target is a guest
        const { data: targetProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', profileId)
            .single();

        if (targetProfile?.role !== 'guest') {
            throw new Error('Target profile is not a guest');
        }

        const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
        const isActive = action === 'approve';

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                approval_status: approvalStatus,
                is_active: isActive
            })
            .eq('id', profileId)
            .select()
            .single();

        if (error) throw error;

        // Log admin action
        await supabase
            .from('admin_logs')
            .insert({
                admin_id: user.id,
                action: `${action}_guest`,
                target_type: 'profile',
                target_id: profileId,
                feedback,
                metadata: {
                    approval_status: approvalStatus
                }
            });

        return { profile: updatedProfile, error: null };
    } catch (error) {
        console.error('Review guest error:', error);
        return { profile: null, error: error.message };
    }
};

/**
 * Get admin logs
 * @param {object} filters - Filter options
 * @returns {Promise<object>} - List of admin logs
 */
export const getAdminLogs = async (filters = {}) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        let query = supabase
            .from('admin_logs')
            .select(`
                *,
                profiles:admin_id (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.action) {
            query = query.eq('action', filters.action);
        }

        if (filters.target_type) {
            query = query.eq('target_type', filters.target_type);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data: logs, error } = await query;

        if (error) throw error;

        return { logs, error: null };
    } catch (error) {
        console.error('Get admin logs error:', error);
        return { logs: null, error: error.message };
    }
};

/**
 * Get platform statistics
 * @returns {Promise<object>} - Platform statistics
 */
export const getPlatformStats = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        // Get counts
        const [
            { count: totalUsers },
            { count: totalStudents },
            { count: totalUniversities },
            { count: totalSoftwareHouses },
            { count: totalInternships },
            { count: totalApplications },
            { count: approvedInternships },
            { count: pendingInternships }
        ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'university'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'software_house'),
            supabase.from('internships').select('*', { count: 'exact', head: true }),
            supabase.from('applications').select('*', { count: 'exact', head: true }),
            supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        return {
            stats: {
                totalUsers: totalUsers || 0,
                totalStudents: totalStudents || 0,
                totalUniversities: totalUniversities || 0,
                totalSoftwareHouses: totalSoftwareHouses || 0,
                totalInternships: totalInternships || 0,
                totalApplications: totalApplications || 0,
                approvedInternships: approvedInternships || 0,
                pendingInternships: pendingInternships || 0
            },
            error: null
        };
    } catch (error) {
        console.error('Get platform stats error:', error);
        return { stats: null, error: error.message };
    }
};

/**
 * Deactivate a user account
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Success status
 */
export const deactivateUser = async (userId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        const { error } = await supabase
            .from('profiles')
            .update({ is_active: false })
            .eq('id', userId);

        if (error) throw error;

        // Log admin action
        await supabase
            .from('admin_logs')
            .insert({
                admin_id: user.id,
                action: 'deactivate_user',
                target_type: 'profile',
                target_id: userId,
                metadata: { is_active: false }
            });

        return { success: true, error: null };
    } catch (error) {
        console.error('Deactivate user error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe to pending items (realtime)
 * @param {function} callback - Callback function for updates
 * @returns {object} - Subscription object
 */
export const subscribeToPendingItems = (callback) => {
    const subscription = supabase
        .channel('admin_pending')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'internships',
                filter: 'status=eq.pending'
            },
            (payload) => {
                callback({ type: 'internship', payload });
            }
        )
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: 'approval_status=eq.pending'
            },
            (payload) => {
                callback({ type: 'profile', payload });
            }
        )
        .subscribe();

    return subscription;
};

