import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import type { Article } from '@shared/schema';

const SENDER_EMAIL = 'contact@whatcyber.com';
const SENDER_NAME = 'WhatCyber';
const BASE_URL = process.env.VERCEL_ENV === 'production'
  ? 'https://www.whatcyber.com'
  : 'http://localhost:5173';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Create SMTP transporter (called lazily to avoid serverless timeout issues)
 */
function createTransporter(): Transporter {
  console.log('📧 Creating SMTP transporter with config:', {
    host: process.env.SMTP_HOST || 'smtp.mailersend.net',
    port: process.env.SMTP_PORT || '587',
    user: process.env.SMTP_USER ? '***SET***' : '***NOT SET***',
    pass: process.env.SMTP_PASS ? '***SET***' : '***NOT SET***',
  });

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailersend.net',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
  });
}

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
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f1419;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f1419; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0f1f; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                      <img src="https://www.whatcyber.com/threatfeed/logo512.png" alt="WhatCyber Logo" style="width: 64px; height: 64px; margin-bottom: 20px; border-radius: 8px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to WhatCyber</h1>
                      <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Cybersecurity Threat Intelligence Platform</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px; color: #e2e8f0;">
                      <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Verify Your Email Address</h2>
                      
                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #cbd5e1;">
                        Hi <strong style="color: #10b981;">${name}</strong>,
                      </p>
                      
                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #cbd5e1;">
                        Thank you for signing up for WhatCyber! You're one step away from accessing real-time cybersecurity threat intelligence, CVE tracking, and security news feeds.
                      </p>
                      
                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #cbd5e1;">
                        Click the button below to verify your email address and activate your account:
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link -->
                      <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin: 30px 0;">
                        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 10px 0;">
                          If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="font-size: 12px; color: #10b981; word-break: break-all; margin: 0;">
                          ${verificationUrl}
                        </p>
                      </div>
                      
                      <!-- Security Notice -->
                      <div style="background-color: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="font-size: 14px; color: #cbd5e1; margin: 0; line-height: 1.5;">
                          <strong style="color: #10b981;">🔒 Security Notice:</strong> This verification link will expire in 24 hours for your security.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0f1419; padding: 30px; text-align: center; border-top: 1px solid #1e293b;">
                      <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0; line-height: 1.5;">
                        If you didn't create an account with WhatCyber, you can safely ignore this email.
                      </p>
                      <p style="font-size: 12px; color: #64748b; margin: 0;">
                        © 2025 WhatCyber. All rights reserved.<br>
                        <a href="https://www.whatcyber.com/threatfeed" style="color: #10b981; text-decoration: none;">www.whatcyber.com/threatfeed</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
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
    const transporter = createTransporter();
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
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f1419;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f1419; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0f1f; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                  
                  <!-- Header with Logo -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                      <img src="https://www.whatcyber.com/threatfeed/logo512.png" alt="WhatCyber Logo" style="width: 64px; height: 64px; margin-bottom: 20px; border-radius: 8px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Password Reset Request</h1>
                      <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">WhatCyber Account Security</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px; color: #e2e8f0;">
                      <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Reset Your Password</h2>
                      
                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #cbd5e1;">
                        Hi <strong style="color: #10b981;">${name}</strong>,
                      </p>
                      
                      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; color: #cbd5e1;">
                        We received a request to reset the password for your WhatCyber account. If you made this request, click the button below to create a new password.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Alternative Link -->
                      <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; margin: 30px 0;">
                        <p style="font-size: 13px; color: #94a3b8; margin: 0 0 10px 0;">
                          If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="font-size: 12px; color: #10b981; word-break: break-all; margin: 0;">
                          ${resetUrl}
                        </p>
                      </div>
                      
                      <!-- Security Notices -->
                      <div style="background-color: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="font-size: 14px; color: #fbbf24; margin: 0 0 8px 0; font-weight: 600;">
                          ⚠️ Important Security Information
                        </p>
                        <p style="font-size: 14px; color: #cbd5e1; margin: 0; line-height: 1.5;">
                          • This reset link will expire in 1 hour<br>
                          • If you didn't request this, please ignore this email<br>
                          • Your password won't change until you create a new one
                        </p>
                      </div>
                      
                      <div style="background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="font-size: 14px; color: #cbd5e1; margin: 0; line-height: 1.5;">
                          <strong style="color: #ef4444;">Didn't request this?</strong> If you're concerned about your account security, please contact us immediately at <a href="mailto:contact@whatcyber.com" style="color: #10b981; text-decoration: none;">contact@whatcyber.com</a>
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0f1419; padding: 30px; text-align: center; border-top: 1px solid #1e293b;">
                      <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0; line-height: 1.5;">
                        This is an automated security email from WhatCyber.
                      </p>
                      <p style="font-size: 12px; color: #64748b; margin: 0;">
                        © 2025 WhatCyber. All rights reserved.<br>
                        <a href="https://www.whatcyber.com/threatfeed" style="color: #10b981; text-decoration: none;">www.whatcyber.com/threatfeed</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
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
    const transporter = createTransporter();
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

/**
 * Generate HTML for the weekly digest
 */
function generateDigestHtml(articles: Partial<Article>[]): string {
  const getThreatColor = (level: string | undefined) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return '#ef4444'; // Red
      case 'HIGH': return '#f97316';     // Orange
      case 'MEDIUM': return '#eab308';   // Yellow
      case 'LOW': return '#3b82f6';      // Blue
      default: return '#94a3b8';         // Slate
    }
  };

  const articlesHtml = articles.map(article => `
    <!-- Threat Item -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111111; border: 1px solid #333333; border-radius: 12px; margin-bottom: 20px;">
        <tr>
            <td style="padding: 25px;">
                <span style="background-color: ${getThreatColor(article.threatLevel)}; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${article.threatLevel || 'UNKNOWN'}</span>
                <h3 style="margin: 15px 0 10px; font-size: 18px; line-height: 26px; font-weight: 700; color: #ffffff;">
                    <a href="https://www.whatcyber.com/article/${article.id}" style="color: #ffffff; text-decoration: none;">${article.title}</a>
                </h3>
                <p style="margin: 0 0 20px; font-size: 14px; line-height: 22px; color: #9ca3af;">
                    ${article.summary ? article.summary.substring(0, 150) + (article.summary.length > 150 ? '...' : '') : 'No summary available.'}
                </p>
                <a href="https://www.whatcyber.com/article/${article.id}" style="font-size: 14px; font-weight: 700; color: #10b981; text-decoration: none;">Read More &rarr;</a>
            </td>
        </tr>
    </table>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8"> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> 
    <meta name="x-apple-disable-message-reformatting"> 
    <title>Weekly Threat Digest</title> 

    <!-- Web Font Reference for Outlook compatibility -->
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->

    <style>
        /* CSS Resets */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #ffffff; color: #000000; }

        /* Mobile Styles */
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: auto !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .hero-text { font-size: 28px !important; line-height: 34px !important; }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">

    <!-- Outer Wrapper -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 20px;">
                
                <!-- The Green Frame Container (Thicker Border via Padding) -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #10b981; border-radius: 16px; overflow: hidden;">
                    <tr>
                        <td align="center" style="padding: 16px;"> <!-- Increased thickness here -->
                            
                            <!-- Inner Content Container -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                                
                                <!-- TOP SECTION: WHITE BACKGROUND (Header) -->
                                <tr>
                                    <td bgcolor="#ffffff" style="padding: 20px 30px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <!-- Logo & Text -->
                                                <td valign="middle">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td valign="middle" style="padding-right: 12px;">
                                                                <a href="https://www.whatcyber.com/" style="text-decoration: none; border: 0;">
                                                                    <img src="https://i.ibb.co/HDw55Gr5/android-chrome-192x192.png" width="40" height="40" alt="Logo" style="display: block; border: 0; border-radius: 8px;">
                                                                </a>
                                                            </td>
                                                            <td valign="middle">
                                                                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #000000; line-height: 1; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">WhatCyber</h1>
                                                                <p style="margin: 0; font-size: 11px; font-weight: 600; color: #10b981; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Threatfeed</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <!-- Login Button -->
                                                <td align="right" valign="middle">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="background-color: #10b981; border-radius: 50px; padding: 8px 20px;">
                                                                <a href="https://www.whatcyber.com/login/" style="color: #000000; font-size: 13px; font-weight: 700; text-decoration: none; display: block; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Log in</a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- HERO SECTION: LIGHT GREY BACKGROUND -->
                                <tr>
                                    <td bgcolor="#f3f4f6" style="padding: 50px 30px; border-bottom: 1px solid #e5e7eb;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td align="left">
                                                    <h2 class="hero-text" style="color: #111827; font-size: 32px; line-height: 40px; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.5px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        WEEKLY<br>THREAT DIGEST
                                                    </h2>
                                                    <p style="color: #4b5563; font-size: 18px; margin: 0; font-weight: 400; line-height: 1.5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        Your curated summary of top cybersecurity threats.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- BOTTOM SECTION: BLACK BACKGROUND (Cards) -->
                                <tr>
                                    <td bgcolor="#000000" style="padding: 40px 20px;">
                                        
                                        ${articlesHtml}

                                        <!-- Footer Content inside Black Section -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 40px; border-top: 1px solid #333333;">
                                            <tr>
                                                <td align="center" style="padding-top: 30px;">
                                                    <a href="https://www.whatcyber.com/" style="text-decoration: none; border: 0;">
                                                        <img src="https://i.ibb.co/HDw55Gr5/android-chrome-192x192.png" width="32" height="32" alt="WhatCyber" style="display: block; border: 0; border-radius: 6px; margin-bottom: 10px;">
                                                    </a>
                                                    <p style="color: #ffffff; font-size: 16px; font-weight: 700; margin: 0 0 2px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">WhatCyber</p>
                                                    <p style="color: #666666; font-size: 12px; margin: 0 0 20px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">Threatfeed</p>
                                                    
                                                    <!-- Socials -->
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="padding: 0 10px;">
                                                                <a href="mailto:support@whatcyber.com" style="text-decoration: none;">
                                                                    <img src="https://img.icons8.com/ios-filled/50/ffffff/mail.png" width="24" height="24" alt="Email" style="display: block; border: 0;">
                                                                </a>
                                                            </td>
                                                            <td style="padding: 0 10px;">
                                                                <a href="https://x.com/whatcyber" style="text-decoration: none;">
                                                                    <img src="https://img.icons8.com/ios-filled/50/ffffff/twitterx.png" width="24" height="24" alt="X" style="display: block; border: 0;">
                                                                </a>
                                                            </td>
                                                            <td style="padding: 0 10px;">
                                                                <a href="https://www.linkedin.com/company/whatcyber/" style="text-decoration: none;">
                                                                    <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png" width="24" height="24" alt="LinkedIn" style="display: block; border: 0;">
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <p style="color: #444444; font-size: 11px; margin-top: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                                                        &copy; ${new Date().getFullYear()} WhatCyber. All rights reserved.<br>
                                                        You are receiving this email because you opted in to weekly digests.
                                                        <a href="https://www.whatcyber.com/settings" style="color: #444444; text-decoration: underline;">Unsubscribe</a><br>
                                                        <span style="color: #333333; font-size: 10px; opacity: 0.5;">Generated: ${new Date().toISOString()}</span>
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>
                            <!-- End Inner Content Container -->

                        </td>
                    </tr>
                </table>
                <!-- End Green Outline Container -->
                
            </td>
        </tr>
    </table>

</body>
</html>
  `;
}

/**
 * Send weekly digest email using Resend
 */
export async function sendWeeklyDigestEmail(to: string, articles: Partial<Article>[]): Promise<void> {
  console.log('📧 Preparing to send weekly digest via Resend:', { to, articleCount: articles.length });

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is missing');
    throw new Error('RESEND_API_KEY is missing');
  }

  try {
    const html = generateDigestHtml(articles);

    const data = await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [to],
      subject: `Weekly Threat Intel Digest - WhatCyber - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html: html,
    });

    console.log('✅ Weekly digest sent successfully:', data);
  } catch (error) {
    console.error('❌ Error sending weekly digest via Resend:', error);
    throw error;
  }
}
