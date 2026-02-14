const crypto = require('crypto');

/**
 * Generate a random token for email verification, password reset, etc.
 * @param {number} length - Length of the token (default: 32)
 * @returns {string} Random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a random numeric code for SMS verification
 * @param {number} length - Length of the code (default: 6)
 * @returns {string} Random numeric code
 */
const generateNumericCode = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a secure random string for various purposes
 * @param {number} length - Length of the string (default: 16)
 * @param {string} charset - Character set to use (default: alphanumeric)
 * @returns {string} Random string
 */
const generateSecureString = (length = 16, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Generate a UUID v4
 * @returns {string} UUID v4 string
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Generate a session ID
 * @returns {string} Session ID
 */
const generateSessionId = () => {
  return generateSecureString(32);
};

/**
 * Generate a request ID for tracking
 * @returns {string} Request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${generateSecureString(8)}`;
};

/**
 * Generate a blood request ID
 * @returns {string} Blood request ID
 */
const generateBloodRequestId = () => {
  return `BR_${Date.now()}_${generateSecureString(6).toUpperCase()}`;
};

/**
 * Generate a donation ID
 * @returns {string} Donation ID
 */
const generateDonationId = () => {
  return `DN_${Date.now()}_${generateSecureString(6).toUpperCase()}`;
};

/**
 * Generate a batch number for blood storage
 * @returns {string} Batch number
 */
const generateBatchNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = generateSecureString(4, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  return `B${year}${month}${day}${random}`;
};

/**
 * Generate a verification code with expiration
 * @param {number} length - Length of the code (default: 6)
 * @param {number} expirationMinutes - Expiration time in minutes (default: 15)
 * @returns {object} Object with code and expiration
 */
const generateVerificationCode = (length = 6, expirationMinutes = 15) => {
  const code = generateNumericCode(length);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  return {
    code,
    expiresAt
  };
};

/**
 * Generate a password reset token with expiration
 * @param {number} expirationHours - Expiration time in hours (default: 1)
 * @returns {object} Object with token and expiration
 */
const generatePasswordResetToken = (expirationHours = 1) => {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  
  return {
    token,
    expiresAt
  };
};

/**
 * Generate an email verification token with expiration
 * @param {number} expirationHours - Expiration time in hours (default: 24)
 * @returns {object} Object with token and expiration
 */
const generateEmailVerificationToken = (expirationHours = 24) => {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  
  return {
    token,
    expiresAt
  };
};

/**
 * Generate a phone verification token with expiration
 * @param {number} expirationMinutes - Expiration time in minutes (default: 10)
 * @returns {object} Object with token and expiration
 */
const generatePhoneVerificationToken = (expirationMinutes = 10) => {
  const token = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  return {
    token,
    expiresAt
  };
};

/**
 * Generate a medical verification token
 * @returns {object} Object with token and expiration
 */
const generateMedicalVerificationToken = () => {
  const token = generateToken(24);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  return {
    token,
    expiresAt
  };
};

/**
 * Generate a unique filename for file uploads
 * @param {string} originalName - Original filename
 * @param {string} prefix - Prefix for the filename (optional)
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = generateSecureString(8);
  const extension = originalName.split('.').pop();
  const name = originalName.split('.').slice(0, -1).join('.');
  
  return `${prefix}${name}_${timestamp}_${random}.${extension}`;
};

/**
 * Generate a QR code data for blood bags
 * @param {string} donationId - Donation ID
 * @param {string} bloodType - Blood type
 * @param {string} batchNumber - Batch number
 * @returns {string} QR code data
 */
const generateQRCodeData = (donationId, bloodType, batchNumber) => {
  return JSON.stringify({
    donationId,
    bloodType,
    batchNumber,
    timestamp: Date.now(),
    type: 'blood_bag'
  });
};

/**
 * Generate a tracking number for blood requests
 * @returns {string} Tracking number
 */
const generateTrackingNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = generateSecureString(6, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  return `TR${year}${month}${day}${random}`;
};

module.exports = {
  generateToken,
  generateNumericCode,
  generateSecureString,
  generateUUID,
  generateSessionId,
  generateRequestId,
  generateBloodRequestId,
  generateDonationId,
  generateBatchNumber,
  generateVerificationCode,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generatePhoneVerificationToken,
  generateMedicalVerificationToken,
  generateUniqueFilename,
  generateQRCodeData,
  generateTrackingNumber
};
