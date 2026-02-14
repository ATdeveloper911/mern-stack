// ============================================
// Create User Script using Supabase Admin API
// Run this to create users when Dashboard fails
// ============================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables (optional)
dotenv.config();

// Supabase configuration
const SUPABASE_URL = 'https://llfskketkhdqetriubjc.supabase.co';
// ⚠️ IMPORTANT: Get your service role key from Supabase Dashboard > Settings > API
// NEVER expose this key in frontend code!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

// Create admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Create a user with the Admin API
 */
async function createUser(email, password, role = 'guest', metadata = {}) {
    try {
        console.log(`Creating user: ${email}...`);

        // Create user using Admin API
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                role: role,
                full_name: metadata.full_name || '',
                ...metadata
            }
        });

        if (error) {
            console.error('❌ Error creating user:', error.message);
            return { success: false, error: error.message };
        }

        if (!data.user) {
            console.error('❌ No user data returned');
            return { success: false, error: 'No user data returned' };
        }

        console.log('✅ User created successfully!');
        console.log('   User ID:', data.user.id);
        console.log('   Email:', data.user.email);

        // Update profile to set role and approval status
        const profileUpdate = {
            role: role,
            full_name: metadata.full_name || '',
            approval_status: role === 'admin' ? 'approved' : 
                           (role === 'student' || role === 'university' ? 'approved' : 'pending'),
            is_active: true
        };

        // Add additional metadata if provided
        if (metadata.phone) profileUpdate.phone = metadata.phone;
        if (metadata.organization_name) profileUpdate.organization_name = metadata.organization_name;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdate)
            .eq('id', data.user.id);

        if (profileError) {
            console.warn('⚠️ Warning: Profile update failed:', profileError.message);
            console.log('   Attempting to create profile...');
            
            // Try to insert profile if update failed
            const { error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: data.user.id,
                    ...profileUpdate
                });

            if (insertError) {
                console.error('❌ Error creating profile:', insertError.message);
                return { 
                    success: false, 
                    error: `User created but profile failed: ${insertError.message}`,
                    user: data.user
                };
            }
        }

        console.log('✅ Profile updated successfully!');
        console.log('   Role:', role);
        console.log('   Approval Status:', profileUpdate.approval_status);

        return {
            success: true,
            user: data.user,
            profile: profileUpdate
        };

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// CREATE YOUR USER HERE
// ============================================

async function main() {
    console.log('🚀 Starting user creation...\n');

    // Create user: taimoorvri@gmail.com
    const result = await createUser(
        'taimoorvri@gmail.com',
        '123456',
        'admin', // Change to 'student', 'university', 'software_house', 'guest', or 'admin'
        {
            full_name: 'Taimoor VRI',
            // phone: 'optional-phone',
            // organization_name: 'optional-org-name'
        }
    );

    console.log('\n' + '='.repeat(50));
    if (result.success) {
        console.log('✅ SUCCESS! User created successfully.');
        console.log('\nYou can now login with:');
        console.log('   Email: taimoorvri@gmail.com');
        console.log('   Password: 123456');
    } else {
        console.log('❌ FAILED! Error:', result.error);
        if (result.user) {
            console.log('\n⚠️ User was created but profile update failed.');
            console.log('   User ID:', result.user.id);
            console.log('   You may need to manually update the profile.');
        }
    }
    console.log('='.repeat(50));
}

// Run the script
main().catch(console.error);


