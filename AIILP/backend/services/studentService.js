// ============================================
// Student Registration Service (FR-02, UC-02)
// Handles bulk student registration via CSV upload
// ============================================

import { supabase } from '../config/supabase.js';
import { parseCSV, validateStudentCSV } from '../utils/csvParser.js';
import { generatePassword } from '../utils/helpers.js';

/**
 * Register a single student
 * @param {object} studentData - Student data
 * @param {string} universityId - University ID
 * @returns {Promise<object>} - Created student record
 */
export const registerStudent = async (studentData, universityId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is a university
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'university' || profile?.id !== universityId) {
            throw new Error('Unauthorized: Only universities can register students');
        }

        // Generate temporary password
        const tempPassword = generatePassword(12);
        
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: studentData.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                role: 'student',
                full_name: studentData.name
            }
        });

        if (authError) throw authError;

        // Create student record
        const { data: student, error: studentError } = await supabase
            .from('students')
            .insert({
                user_id: authData.user.id,
                university_id: universityId,
                name: studentData.name,
                email: studentData.email,
                student_id: studentData.student_id,
                batch: studentData.batch,
                degree_program: studentData.degree_program,
                semester: studentData.semester,
                credentials: {
                    password: tempPassword,
                    generated_at: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (studentError) {
            // Rollback: delete auth user if student creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw studentError;
        }

        // Update profile with university_id
        await supabase
            .from('profiles')
            .update({ university_id: universityId })
            .eq('id', authData.user.id);

        return {
            student,
            credentials: {
                email: studentData.email,
                password: tempPassword
            },
            error: null
        };
    } catch (error) {
        console.error('Register student error:', error);
        return {
            student: null,
            credentials: null,
            error: error.message
        };
    }
};

/**
 * Register multiple students from CSV data
 * @param {Array} studentsData - Array of student data objects
 * @param {string} universityId - University ID
 * @returns {Promise<object>} - Registration results
 */
export const registerStudentsBulk = async (studentsData, universityId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Verify user is a university
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'university' || profile?.id !== universityId) {
            throw new Error('Unauthorized: Only universities can register students');
        }

        const results = {
            successful: [],
            failed: [],
            total: studentsData.length
        };

        // Process each student
        for (const studentData of studentsData) {
            try {
                // Validate student data
                const validation = validateStudentCSV(studentData);
                if (!validation.valid) {
                    results.failed.push({
                        data: studentData,
                        error: validation.error
                    });
                    continue;
                }

                // Check if email already exists
                const { data: existing } = await supabase
                    .from('students')
                    .select('email')
                    .eq('email', studentData.email)
                    .single();

                if (existing) {
                    results.failed.push({
                        data: studentData,
                        error: 'Email already exists'
                    });
                    continue;
                }

                // Register student
                const result = await registerStudent(studentData, universityId);
                if (result.error) {
                    results.failed.push({
                        data: studentData,
                        error: result.error
                    });
                } else {
                    results.successful.push({
                        student: result.student,
                        credentials: result.credentials
                    });
                }
            } catch (error) {
                results.failed.push({
                    data: studentData,
                    error: error.message
                });
            }
        }

        return {
            ...results,
            error: null
        };
    } catch (error) {
        console.error('Bulk registration error:', error);
        return {
            successful: [],
            failed: [],
            total: 0,
            error: error.message
        };
    }
};

/**
 * Upload CSV file and process bulk registration
 * @param {File} file - CSV file
 * @param {string} universityId - University ID
 * @returns {Promise<object>} - Upload and registration results
 */
export const uploadCSVAndRegister = async (file, universityId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        // Validate file
        if (!file || file.type !== 'text/csv') {
            throw new Error('Invalid file type. Please upload a CSV file.');
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('File size exceeds 5MB limit.');
        }

        // Upload file to Supabase Storage
        const fileName = `bulk-uploads/${universityId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('csv-uploads')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Create bulk upload record
        const { data: bulkUpload, error: bulkError } = await supabase
            .from('bulk_uploads')
            .insert({
                university_id: universityId,
                file_name: file.name,
                file_path: uploadData.path,
                status: 'processing',
                total_records: 0
            })
            .select()
            .single();

        if (bulkError) throw bulkError;

        // Parse CSV
        const csvText = await file.text();
        const { data: studentsData, error: parseError } = parseCSV(csvText);

        if (parseError) {
            await supabase
                .from('bulk_uploads')
                .update({
                    status: 'failed',
                    error_log: { error: parseError }
                })
                .eq('id', bulkUpload.id);
            throw new Error(`CSV parsing error: ${parseError}`);
        }

        // Update total records
        await supabase
            .from('bulk_uploads')
            .update({ total_records: studentsData.length })
            .eq('id', bulkUpload.id);

        // Register students
        const registrationResult = await registerStudentsBulk(studentsData, universityId);

        // Update bulk upload record
        await supabase
            .from('bulk_uploads')
            .update({
                status: registrationResult.failed.length === 0 ? 'completed' : 'completed',
                successful_records: registrationResult.successful.length,
                failed_records: registrationResult.failed.length,
                error_log: registrationResult.failed.length > 0 ? {
                    errors: registrationResult.failed
                } : null,
                completed_at: new Date().toISOString()
            })
            .eq('id', bulkUpload.id);

        return {
            bulkUpload: {
                ...bulkUpload,
                status: 'completed',
                successful_records: registrationResult.successful.length,
                failed_records: registrationResult.failed.length
            },
            registration: registrationResult,
            error: null
        };
    } catch (error) {
        console.error('CSV upload error:', error);
        return {
            bulkUpload: null,
            registration: null,
            error: error.message
        };
    }
};

/**
 * Get all students for a university
 * @param {string} universityId - University ID
 * @returns {Promise<object>} - List of students
 */
export const getUniversityStudents = async (universityId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('university_id', universityId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { students, error: null };
    } catch (error) {
        console.error('Get students error:', error);
        return { students: null, error: error.message };
    }
};

/**
 * Get student by ID
 * @param {string} studentId - Student ID
 * @returns {Promise<object>} - Student data
 */
export const getStudentById = async (studentId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (error) throw error;

        return { student, error: null };
    } catch (error) {
        console.error('Get student error:', error);
        return { student: null, error: error.message };
    }
};

/**
 * Get bulk upload history
 * @param {string} universityId - University ID
 * @returns {Promise<object>} - List of bulk uploads
 */
export const getBulkUploadHistory = async (universityId) => {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Authentication required');

        const { data: uploads, error } = await supabase
            .from('bulk_uploads')
            .select('*')
            .eq('university_id', universityId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { uploads, error: null };
    } catch (error) {
        console.error('Get upload history error:', error);
        return { uploads: null, error: error.message };
    }
};

