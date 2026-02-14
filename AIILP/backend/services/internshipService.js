// ============================================
// Internship Posting Service (FR-03, UC-03)
// Handles internship creation, approval, and management
// ============================================

import { supabase } from '../config/supabase.js';

/**
 * Create a new internship posting
 * @param {object} internshipData - Internship data
 * @returns {Promise<object>} - Created internship
 */
export const createInternship = async (internshipData) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is a software house with approved status
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, approval_status')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'software_house') {
            throw new Error('Unauthorized: Only software houses can create internships');
        }

        if (profile?.approval_status !== 'approved') {
            throw new Error('Account is pending approval. Please wait for administrator approval.');
        }

        // Validate required fields
        if (!internshipData.title || !internshipData.description || 
            !internshipData.skills || !internshipData.duration) {
            throw new Error('Please fill all required fields');
        }

        // Create internship
        const { data: internship, error } = await supabase
            .from('internships')
            .insert({
                software_house_id: user.id,
                title: internshipData.title,
                description: internshipData.description,
                skills: Array.isArray(internshipData.skills) 
                    ? internshipData.skills 
                    : internshipData.skills.split(',').map(s => s.trim()),
                duration: internshipData.duration,
                location: internshipData.location,
                stipend: internshipData.stipend,
                requirements: internshipData.requirements,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        return { internship, error: null };
    } catch (error) {
        console.error('Create internship error:', error);
        return { internship: null, error: error.message };
    }
};

/**
 * Get all approved internships
 * @param {object} filters - Filter options (status, skills, etc.)
 * @returns {Promise<object>} - List of internships
 */
export const getApprovedInternships = async (filters = {}) => {
    try {
        let query = supabase
            .from('internships')
            .select(`
                *,
                profiles:software_house_id (
                    id,
                    organization_name,
                    full_name
                )
            `)
            .eq('status', 'approved')
            .order('approved_at', { ascending: false });

        // Apply filters
        if (filters.skills && filters.skills.length > 0) {
            query = query.contains('skills', filters.skills);
        }

        if (filters.location) {
            query = query.ilike('location', `%${filters.location}%`);
        }

        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data: internships, error } = await query;

        if (error) throw error;

        return { internships, error: null };
    } catch (error) {
        console.error('Get internships error:', error);
        return { internships: null, error: error.message };
    }
};

/**
 * Get internship by ID
 * @param {string} internshipId - Internship ID
 * @returns {Promise<object>} - Internship data
 */
export const getInternshipById = async (internshipId) => {
    try {
        const { data: internship, error } = await supabase
            .from('internships')
            .select(`
                *,
                profiles:software_house_id (
                    id,
                    organization_name,
                    full_name,
                    phone
                )
            `)
            .eq('id', internshipId)
            .single();

        if (error) throw error;

        return { internship, error: null };
    } catch (error) {
        console.error('Get internship error:', error);
        return { internship: null, error: error.message };
    }
};

/**
 * Get internships by software house
 * @param {string} softwareHouseId - Software house ID
 * @returns {Promise<object>} - List of internships
 */
export const getSoftwareHouseInternships = async (softwareHouseId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user owns the software house or is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'software_house' && profile?.role !== 'admin') {
            throw new Error('Unauthorized');
        }

        if (profile?.role === 'software_house' && user.id !== softwareHouseId) {
            throw new Error('Unauthorized: Can only view own internships');
        }

        const { data: internships, error } = await supabase
            .from('internships')
            .select('*')
            .eq('software_house_id', softwareHouseId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { internships, error: null };
    } catch (error) {
        console.error('Get software house internships error:', error);
        return { internships: null, error: error.message };
    }
};

/**
 * Update internship (only if pending)
 * @param {string} internshipId - Internship ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated internship
 */
export const updateInternship = async (internshipId, updates) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Check if internship exists and is pending
        const { data: existing } = await supabase
            .from('internships')
            .select('software_house_id, status')
            .eq('id', internshipId)
            .single();

        if (!existing) throw new Error('Internship not found');

        if (existing.status !== 'pending') {
            throw new Error('Can only update pending internships');
        }

        if (existing.software_house_id !== user.id) {
            throw new Error('Unauthorized: Can only update own internships');
        }

        // Update internship
        const { data: internship, error } = await supabase
            .from('internships')
            .update(updates)
            .eq('id', internshipId)
            .select()
            .single();

        if (error) throw error;

        return { internship, error: null };
    } catch (error) {
        console.error('Update internship error:', error);
        return { internship: null, error: error.message };
    }
};

/**
 * Delete internship (only if pending)
 * @param {string} internshipId - Internship ID
 * @returns {Promise<object>} - Success status
 */
export const deleteInternship = async (internshipId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Check if internship exists and is pending
        const { data: existing } = await supabase
            .from('internships')
            .select('software_house_id, status')
            .eq('id', internshipId)
            .single();

        if (!existing) throw new Error('Internship not found');

        if (existing.status !== 'pending') {
            throw new Error('Can only delete pending internships');
        }

        if (existing.software_house_id !== user.id) {
            throw new Error('Unauthorized: Can only delete own internships');
        }

        const { error } = await supabase
            .from('internships')
            .delete()
            .eq('id', internshipId);

        if (error) throw error;

        return { success: true, error: null };
    } catch (error) {
        console.error('Delete internship error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get pending internships (for admin)
 * @returns {Promise<object>} - List of pending internships
 */
export const getPendingInternships = async () => {
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

        const { data: internships, error } = await supabase
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

        if (error) throw error;

        return { internships, error: null };
    } catch (error) {
        console.error('Get pending internships error:', error);
        return { internships: null, error: error.message };
    }
};

/**
 * Subscribe to internships (realtime)
 * @param {function} callback - Callback function for updates
 * @returns {object} - Subscription object
 */
export const subscribeToInternships = (callback) => {
    const subscription = supabase
        .channel('internships')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'internships',
                filter: 'status=eq.approved'
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return subscription;
};

