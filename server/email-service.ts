import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import type { Article } from '@shared/schema';

const SENDER_EMAIL = 'contact@whatcyber.com';
const SENDER_NAME = 'WhatCyber';
const BASE_URL = process.env.VERCEL_ENV === 'production'
  ? 'https://www.whatcyber.com/threatfeed'
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
    <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 20px; border: 1px solid #334155;">
      <div style="margin-bottom: 10px;">
        <span style="background-color: ${getThreatColor(article.threatLevel)}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
          ${article.threatLevel || 'UNKNOWN'}
        </span>
        <h3 style="margin: 0; font-size: 18px; color: #f8fafc; line-height: 1.4;">
          <a href="${article.url}" style="color: #f8fafc; text-decoration: none;">${article.title}</a>
        </h3>
      </div>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
        ${article.summary ? article.summary.substring(0, 150) + (article.summary.length > 150 ? '...' : '') : 'No summary available.'}
      </p>
      <a href="${article.url}" style="color: #10b981; font-size: 14px; font-weight: 600; text-decoration: none;">Read More →</a>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f1419; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f1419; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0a0f1f; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <img src="https://www.whatcyber.com/threatfeed/logo512.png" alt="WhatCyber Logo" style="width: 64px; height: 64px; margin-bottom: 20px; border-radius: 8px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Weekly Threat Digest</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Your curated summary of top cybersecurity threats</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; color: #e2e8f0;">
                    <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Top Threats This Week</h2>
                    ${articlesHtml}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f1419; padding: 30px; text-align: center; border-top: 1px solid #1e293b;">
                    <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0; line-height: 1.5;">
                      You are receiving this email because you opted in to weekly digests from WhatCyber.
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
      subject: 'Weekly Threat Intel Digest - WhatCyber',
      html: html,
    });

    console.log('✅ Weekly digest sent successfully:', data);
  } catch (error) {
    console.error('❌ Error sending weekly digest via Resend:', error);
    throw error;
  }
}
