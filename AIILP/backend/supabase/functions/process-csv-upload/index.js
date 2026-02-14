// ============================================
// Supabase Edge Function: Process CSV Upload
// Handles CSV file processing for bulk student registration
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ error: 'Missing Supabase configuration' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse request body: support either csvText or filePath
        const { filePath, csvText, universityId, bulkUploadId } = await req.json();

        if ((!csvText && !filePath) || !universityId || !bulkUploadId) {
            return new Response(
                JSON.stringify({ error: 'Missing required parameters (csvText or filePath, universityId, bulkUploadId)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let csvContent = csvText;
        if (!csvContent && filePath) {
            // Download CSV file from storage (legacy path)
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('csv-uploads')
                .download(filePath);

            if (downloadError) {
                throw downloadError;
            }
            csvContent = await fileData.text();
        }

        // Parse CSV
        const { data: studentsData, error: parseError } = parseCSV(csvContent);

        if (parseError) {
            // Update bulk upload with error
            await supabase
                .from('bulk_uploads')
                .update({
                    status: 'failed',
                    error_log: { error: parseError }
                })
                .eq('id', bulkUploadId);

            return new Response(
                JSON.stringify({ error: parseError }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Process students
        const results = {
            successful: [],
            failed: [],
            total: studentsData.length
        };

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

                // Check if email exists
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

                // Generate password
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

                if (authError) {
                    results.failed.push({
                        data: studentData,
                        error: authError.message
                    });
                    continue;
                }

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
                    // Rollback: delete auth user
                    await supabase.auth.admin.deleteUser(authData.user.id);
                    results.failed.push({
                        data: studentData,
                        error: studentError.message
                    });
                    continue;
                }

                // Update profile with university_id
                await supabase
                    .from('profiles')
                    .update({ university_id: universityId })
                    .eq('id', authData.user.id);

                results.successful.push({
                    student,
                    credentials: {
                        email: studentData.email,
                        password: tempPassword
                    }
                });
            } catch (error) {
                results.failed.push({
                    data: studentData,
                    error: error.message
                });
            }
        }

        // Update bulk upload record
        await supabase
            .from('bulk_uploads')
            .update({
                status: 'completed',
                successful_records: results.successful.length,
                failed_records: results.failed.length,
                error_log: results.failed.length > 0 ? {
                    errors: results.failed
                } : null,
                completed_at: new Date().toISOString()
            })
            .eq('id', bulkUploadId);

        return new Response(
            JSON.stringify({
                success: true,
                results
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error processing CSV:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// Helper functions (same as in csvParser.js)
function parseCSV(csvText) {
    try {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            return {
                data: null,
                error: 'CSV file must contain at least a header row and one data row'
            };
        }

        const header = parseCSVLine(lines[0]);
        const expectedHeaders = ['name', 'email', 'student_id', 'batch', 'degree_program', 'semester'];

        const missingHeaders = expectedHeaders.filter(h => !header.includes(h.toLowerCase()));
        if (missingHeaders.length > 0) {
            return {
                data: null,
                error: `Missing required headers: ${missingHeaders.join(', ')}`
            };
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === header.length) {
                const row = {};
                header.forEach((col, index) => {
                    row[col.toLowerCase()] = values[index]?.trim() || '';
                });
                data.push(row);
            }
        }

        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

function validateStudentCSV(studentData) {
    const errors = [];
    if (!studentData.name || studentData.name.trim() === '') {
        errors.push('Name is required');
    }
    if (!studentData.email || studentData.email.trim() === '') {
        errors.push('Email is required');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.email)) {
            errors.push('Invalid email format');
        }
    }
    if (!studentData.student_id || studentData.student_id.trim() === '') {
        errors.push('Student ID is required');
    }
    return {
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : null
    };
}

function generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

