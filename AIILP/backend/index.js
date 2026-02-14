// ============================================
// Backend Index - Main Export File
// AIILP - Academic Industry Internship Linkage Platform
// ============================================

// Export Supabase client
export { supabase, getAdminClient } from './config/supabase.js';

// Export all services
export * as authService from './services/authService.js';
export * as studentService from './services/studentService.js';
export * as internshipService from './services/internshipService.js';
export * as applicationService from './services/applicationService.js';
export * as cvService from './services/cvService.js';
export * as adminService from './services/adminService.js';
export * as statusTrackingService from './services/statusTrackingService.js';

// Export utilities
export * as csvParser from './utils/csvParser.js';
export * as helpers from './utils/helpers.js';

