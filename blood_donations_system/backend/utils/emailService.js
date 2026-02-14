const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
    return this.transporter;
  }

  async verifyConnection() {
    try {
      await this.getTransporter().verify();
      logger.info('Email service connection verified successfully');
    } catch (error) {
      logger.error('Email service connection failed:', error);
    }
  }

  async sendEmail(options) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.getTransporter().sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Email templates
  getEmailTemplates() {
    return {
      welcome: (userName) => ({
        subject: 'Welcome to BloodLink - Your Account is Ready!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🩸 BloodLink</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Connecting Lives Through Blood Donation</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome, ${userName}!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Thank you for joining BloodLink! Your account has been successfully created and you're now part of our life-saving community.
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">What's Next?</h3>
                <ul style="color: #4b5563; line-height: 1.8;">
                  <li>Complete your profile with medical information</li>
                  <li>Verify your email address</li>
                  <li>Set your availability for donations</li>
                  <li>Start saving lives!</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL}/dashboard" 
                   style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Go to Dashboard
                </a>
              </div>
            </div>
            <div style="background: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                © 2024 BloodLink. All rights reserved.
              </p>
            </div>
          </div>
        `,
        text: `Welcome to BloodLink, ${userName}! Your account has been created successfully. Visit ${process.env.CLIENT_URL}/dashboard to get started.`
      }),

      emailVerification: (userName, verificationToken) => ({
        subject: 'Verify Your Email - BloodLink',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🩸 BloodLink</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Email Address</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Hi ${userName}, please verify your email address to complete your BloodLink account setup.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL}/verify-email?token=${verificationToken}" 
                   style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                This link will expire in 24 hours. If you didn't create an account, please ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `Hi ${userName}, please verify your email by clicking this link: ${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`
      }),

      passwordReset: (userName, resetToken) => ({
        subject: 'Reset Your Password - BloodLink',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🩸 BloodLink</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your Password</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Hi ${userName}, you requested to reset your password. Click the button below to create a new password.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}" 
                   style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `Hi ${userName}, reset your password by clicking this link: ${process.env.CLIENT_URL}/reset-password?token=${resetToken}`
      }),

      bloodRequestAlert: (donorName, requestDetails) => ({
        subject: '🚨 Urgent Blood Request - Your Help is Needed!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🚨 URGENT REQUEST</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Donation Needed</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${donorName},</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                There's an urgent blood request that matches your blood type and location. Your help could save a life!
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Request Details:</h3>
                <p><strong>Blood Type:</strong> ${requestDetails.bloodType}</p>
                <p><strong>Location:</strong> ${requestDetails.location}</p>
                <p><strong>Urgency:</strong> ${requestDetails.urgency}</p>
                <p><strong>Required By:</strong> ${requestDetails.requiredBy}</p>
                <p><strong>Hospital:</strong> ${requestDetails.hospitalName}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.CLIENT_URL}/blood-requests/${requestDetails.id}" 
                   style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  View Request Details
                </a>
              </div>
            </div>
          </div>
        `,
        text: `Urgent blood request: ${requestDetails.bloodType} needed at ${requestDetails.location}. View details: ${process.env.CLIENT_URL}/blood-requests/${requestDetails.id}`
      }),

      donationReminder: (donorName, donationDate) => ({
        subject: 'Reminder: Your Blood Donation Appointment',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🩸 BloodLink</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Donation Reminder</p>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Donation Reminder</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Hi ${donorName}, this is a friendly reminder about your upcoming blood donation appointment.
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #14b8a6; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Appointment Details:</h3>
                <p><strong>Date:</strong> ${donationDate}</p>
                <p><strong>Time:</strong> Please arrive 15 minutes early</p>
                <p><strong>Location:</strong> Check your dashboard for details</p>
              </div>
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="color: #92400e; margin-top: 0;">Before Your Donation:</h4>
                <ul style="color: #92400e; margin: 0;">
                  <li>Get a good night's sleep</li>
                  <li>Eat a healthy meal</li>
                  <li>Drink plenty of water</li>
                  <li>Bring a valid ID</li>
                </ul>
              </div>
            </div>
          </div>
        `,
        text: `Donation reminder: Your appointment is scheduled for ${donationDate}. Please arrive 15 minutes early.`
      })
    };
  }

  async sendWelcomeEmail(user) {
    const template = this.getEmailTemplates().welcome(user.firstName);
    return await this.sendEmail({
      to: user.email,
      ...template
    });
  }

  async sendVerificationEmail(user, token) {
    const template = this.getEmailTemplates().emailVerification(user.firstName, token);
    return await this.sendEmail({
      to: user.email,
      ...template
    });
  }

  async sendPasswordResetEmail(user, token) {
    const template = this.getEmailTemplates().passwordReset(user.firstName, token);
    return await this.sendEmail({
      to: user.email,
      ...template
    });
  }

  async sendBloodRequestAlert(donor, requestDetails) {
    const template = this.getEmailTemplates().bloodRequestAlert(donor.firstName, requestDetails);
    return await this.sendEmail({
      to: donor.email,
      ...template
    });
  }

  async sendDonationReminder(donor, donationDate) {
    const template = this.getEmailTemplates().donationReminder(donor.firstName, donationDate);
    return await this.sendEmail({
      to: donor.email,
      ...template
    });
  }
}

module.exports = EmailService;
