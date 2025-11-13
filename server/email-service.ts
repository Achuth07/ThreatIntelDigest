import nodemailer from 'nodemailer';

// SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailersend.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const SENDER_EMAIL = 'contact@whatcyber.com';
const SENDER_NAME = 'WhatCyber';
const BASE_URL = process.env.VERCEL_ENV === 'production' 
  ? 'https://threatfeed.whatcyber.com' 
  : 'http://localhost:5173';

/**
 * Send email verification email using SMTP
 * @param to Recipient email address
 * @param name Recipient name
 * @param verificationToken Verification token
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${BASE_URL}/api/auth/email/verify?token=${verificationToken}`;
  
  console.log('📧 Preparing to send verification email via SMTP:', {
    to,
    from: SENDER_EMAIL,
    verificationUrl
  });

  const mailOptions = {
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: to,
    subject: 'Verify Your Email - WhatCyber',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to WhatCyber!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Thank you for registering with WhatCyber, your trusted source for cybersecurity threat intelligence.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              To complete your registration and verify your email address, please click the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
              ${verificationUrl}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This verification link will expire in 24 hours for security reasons.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn't create an account with WhatCyber, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to WhatCyber!
      
      Hi ${name},
      
      Thank you for registering with WhatCyber, your trusted source for cybersecurity threat intelligence.
      
      To complete your registration and verify your email address, please visit:
      ${verificationUrl}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't create an account with WhatCyber, you can safely ignore this email.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully:', { 
      to, 
      messageId: info.messageId,
      response: info.response 
    });
  } catch (error: any) {
    console.error('❌ Error sending verification email via SMTP:', {
      to,
      error: error.message,
      code: error.code,
      command: error.command,
      fullError: error
    });
    
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send password reset email using SMTP
 * @param to Recipient email address
 * @param name Recipient name
 * @param resetToken Password reset token
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;
  
  console.log('📧 Preparing to send password reset email via SMTP:', {
    to,
    from: SENDER_EMAIL,
    resetUrl
  });

  const mailOptions = {
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: to,
    subject: 'Reset Your Password - WhatCyber',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              We received a request to reset your password for your WhatCyber account.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              To reset your password, please click the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This password reset link will expire in 1 hour for security reasons.
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from WhatCyber. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hi ${name},
      
      We received a request to reset your password for your WhatCyber account.
      
      To reset your password, please visit:
      ${resetUrl}
      
      This password reset link will expire in 1 hour for security reasons.
      
      Security Notice: If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', { 
      to, 
      messageId: info.messageId,
      response: info.response 
    });
  } catch (error: any) {
    console.error('❌ Error sending password reset email via SMTP:', {
      to,
      error: error.message,
      code: error.code,
      command: error.command,
      fullError: error
    });
    
    throw new Error('Failed to send password reset email');
  }
}
