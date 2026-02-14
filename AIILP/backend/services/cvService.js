// ============================================
// CV Form Service (FR-05, UC-05)
// Handles CV form creation, updates, and management
// ============================================

import { supabase } from '../config/supabase.js';

/**
 * Create or update CV form
 * @param {object} cvData - CV form data
 * @returns {Promise<object>} - Created/updated CV form
 */
export const saveCVForm = async (cvData) => {
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
            throw new Error('Only students and guest users can manage CV forms');
        }

        // Validate mandatory fields
        const validation = validateCVForm(cvData);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Check if CV form exists
        const { data: existing } = await supabase
            .from('cv_forms')
            .select('id')
            .eq('user_id', user.id)
            .single();

        let result;
        if (existing) {
            // Update existing CV form
            const { data: cvForm, error } = await supabase
                .from('cv_forms')
                .update({
                    personal: cvData.personal,
                    education: cvData.education,
                    skills: Array.isArray(cvData.skills) 
                        ? cvData.skills 
                        : cvData.skills.split(',').map(s => s.trim()),
                    experience: cvData.experience,
                    projects: cvData.projects,
                    certifications: cvData.certifications,
                    languages: cvData.languages,
                    is_complete: validation.isComplete,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = cvForm;
        } else {
            // Create new CV form
            const { data: cvForm, error } = await supabase
                .from('cv_forms')
                .insert({
                    user_id: user.id,
                    personal: cvData.personal,
                    education: cvData.education,
                    skills: Array.isArray(cvData.skills) 
                        ? cvData.skills 
                        : cvData.skills.split(',').map(s => s.trim()),
                    experience: cvData.experience,
                    projects: cvData.projects,
                    certifications: cvData.certifications,
                    languages: cvData.languages,
                    is_complete: validation.isComplete
                })
                .select()
                .single();

            if (error) throw error;
            result = cvForm;
        }

        return { cvForm: result, error: null };
    } catch (error) {
        console.error('Save CV form error:', error);
        return { cvForm: null, error: error.message };
    }
};

/**
 * Get user's CV form
 * @returns {Promise<object>} - CV form data
 */
export const getCVForm = async () => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        const { data: cvForm, error } = await supabase
            .from('cv_forms')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return { cvForm: cvForm || null, error: null };
    } catch (error) {
        console.error('Get CV form error:', error);
        return { cvForm: null, error: error.message };
    }
};

/**
 * Get CV form by user ID (for software houses viewing applicants)
 * @param {string} userId - User ID
 * @returns {Promise<object>} - CV form data
 */
export const getCVFormByUserId = async (userId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is software house or admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'software_house' && profile?.role !== 'admin') {
            throw new Error('Unauthorized: Only software houses and admins can view CV forms');
        }

        const { data: cvForm, error } = await supabase
            .from('cv_forms')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        return { cvForm, error: null };
    } catch (error) {
        console.error('Get CV form by user ID error:', error);
        return { cvForm: null, error: error.message };
    }
};

/**
 * Check if CV form is complete
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Completion status
 */
export const isCVComplete = async (userId) => {
    try {
        const { data: cvForm, error } = await supabase
            .from('cv_forms')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!cvForm) {
            return { isComplete: false, error: null };
        }

        // Check mandatory fields
        const hasPersonal = cvForm.personal && 
            cvForm.personal.name && 
            cvForm.personal.email;
        const hasEducation = cvForm.education && 
            Array.isArray(cvForm.education) && 
            cvForm.education.length > 0;
        const hasSkills = cvForm.skills && 
            Array.isArray(cvForm.skills) && 
            cvForm.skills.length > 0;

        const isComplete = hasPersonal && hasEducation && hasSkills;

        return { 
            isComplete: isComplete && cvForm.is_complete, 
            cvForm,
            error: null 
        };
    } catch (error) {
        console.error('Check CV complete error:', error);
        return { isComplete: false, error: error.message };
    }
};

/**
 * Generate CV preview (formatted data)
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Formatted CV preview
 */
export const generateCVPreview = async (userId) => {
    try {
        const { data: cvForm, error } = await getCVForm();
        if (error) throw new Error(error);

        if (!cvForm) {
            throw new Error('CV form not found');
        }

        // Format CV data for preview
        const preview = {
            personal: cvForm.personal || {},
            education: cvForm.education || [],
            skills: cvForm.skills || [],
            experience: cvForm.experience || [],
            projects: cvForm.projects || [],
            certifications: cvForm.certifications || [],
            languages: cvForm.languages || [],
            isComplete: cvForm.is_complete,
            lastUpdated: cvForm.updated_at
        };

        return { preview, error: null };
    } catch (error) {
        console.error('Generate CV preview error:', error);
        return { preview: null, error: error.message };
    }
};

/**
 * Validate CV form data
 * @param {object} cvData - CV form data
 * @returns {object} - Validation result
 */
const validateCVForm = (cvData) => {
    const errors = [];

    // Check personal information
    if (!cvData.personal || !cvData.personal.name) {
        errors.push('Personal information: Name is required');
    }
    if (!cvData.personal || !cvData.personal.email) {
        errors.push('Personal information: Email is required');
    }

    // Check education
    if (!cvData.education || !Array.isArray(cvData.education) || cvData.education.length === 0) {
        errors.push('Education: At least one education entry is required');
    }

    // Check skills
    if (!cvData.skills || 
        (Array.isArray(cvData.skills) && cvData.skills.length === 0) ||
        (typeof cvData.skills === 'string' && cvData.skills.trim() === '')) {
        errors.push('Skills: At least one skill is required');
    }

    const isValid = errors.length === 0;
    const isComplete = isValid && 
        cvData.personal && 
        cvData.education && 
        cvData.skills;

    return {
        valid: isValid,
        isComplete,
        error: errors.length > 0 ? errors.join('; ') : null
    };
};

