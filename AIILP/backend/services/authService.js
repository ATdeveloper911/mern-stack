// ============================================
// Authentication Service (FR-01, UC-01)
// Handles user authentication and role-based access
// ============================================

import { supabase } from '../config/supabase.js';

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} role - User role (student, university, software_house, guest, admin)
 * @param {object} metadata - Additional user metadata
 * @returns {Promise<object>} - User data and session
 */
export const signUp = async (email, password, role, metadata = {}) => {
    try {
        // Validate role
        const validRoles = ['student', 'university', 'software_house', 'guest', 'admin'];
        if (!validRoles.includes(role)) {
            throw new Error('Invalid role specified');
        }

        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
                    full_name: metadata.full_name || '',
                    ...metadata
                }
            }
        });

        if (authError) throw authError;

        // Profile is created automatically via trigger
        // But we can update it if needed
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    role,
                    full_name: metadata.full_name,
                    phone: metadata.phone,
                    organization_name: metadata.organization_name,
                    approval_status: role === 'admin' ? 'approved' : 
                                   (role === 'software_house' || role === 'guest' ? 'pending' : 'approved')
                })
                .eq('id', authData.user.id);

            if (profileError) {
                console.error('Error updating profile:', profileError);
            }
        }

        return {
            user: authData.user,
            session: authData.session,
            error: null
        };
    } catch (error) {
        console.error('Sign up error:', error);
        return {
            user: null,
            session: null,
            error: error.message
        };
    }
};

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - User data, session, and role
 */
export const signIn = async (email, password) => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) throw authError;

        // Get user profile with role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, approval_status, is_active')
            .eq('id', authData.user.id)
            .single();

        if (profileError) throw profileError;

        // Check if account is active
        if (!profile.is_active) {
            throw new Error('Account is deactivated. Please contact administrator.');
        }

        // Check approval status for software houses and guests
        if ((profile.role === 'software_house' || profile.role === 'guest') && 
            profile.approval_status !== 'approved') {
            throw new Error('Account is pending approval. Please wait for administrator approval.');
        }

        return {
            user: authData.user,
            session: authData.session,
            role: profile.role,
            error: null
        };
    } catch (error) {
        console.error('Sign in error:', error);
        return {
            user: null,
            session: null,
            role: null,
            error: error.message
        };
    }
};

/**
 * Sign out current user
 * @returns {Promise<object>} - Success status
 */
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get current user session
 * @returns {Promise<object>} - Current session and user
 */
export const getCurrentSession = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
            return { session: null, user: null, role: null, error: null };
        }

        // Get user role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        return {
            session,
            user: session.user,
            role: profile?.role || null,
            error: null
        };
    } catch (error) {
        console.error('Get session error:', error);
        return {
            session: null,
            user: null,
            role: null,
            error: error.message
        };
    }
};

/**
 * Get current user profile
 * @returns {Promise<object>} - User profile data
 */
export const getCurrentUserProfile = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No user found');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        return { profile, error: null };
    } catch (error) {
        console.error('Get profile error:', error);
        return { profile: null, error: error.message };
    }
};

/**
 * Update user profile
 * @param {object} updates - Profile fields to update
 * @returns {Promise<object>} - Updated profile
 */
export const updateProfile = async (updates) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No user found');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (profileError) throw profileError;

        return { profile, error: null };
    } catch (error) {
        console.error('Update profile error:', error);
        return { profile: null, error: error.message };
    }
};

/**
 * Reset password
 * @param {string} email - User email
 * @returns {Promise<object>} - Success status
 */
export const resetPassword = async (email) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });
        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update password
 * @param {string} newPassword - New password
 * @returns {Promise<object>} - Success status
 */
export const updatePassword = async (newPassword) => {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return { success: true, error: null };
    } catch (error) {
        console.error('Update password error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if user has specific role
 * @param {string} role - Role to check
 * @returns {Promise<boolean>} - Whether user has the role
 */
export const hasRole = async (role) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return false;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return profile?.role === role;
    } catch (error) {
        console.error('Check role error:', error);
        return false;
    }
};

