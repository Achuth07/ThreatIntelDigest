import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

const SENDER_EMAIL = 'noreply@whatcyber.com';
const SENDER_NAME = 'WhatCyber';
const BASE_URL = process.env.VERCEL_ENV === 'production' 
  ? 'https://threatfeed.whatcyber.com' 
  : 'http://localhost:5173';

/**
 * Send email verification email
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
  
  const sentFrom = new Sender(SENDER_EMAIL, SENDER_NAME);
  const recipients = [new Recipient(to, name)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject('Verify your WhatCyber account')
    .setHtml(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%);
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: #00d9ff;
            margin: 0;
            font-size: 28px;
          }
          .content {
            background: #ffffff;
            padding: 40px 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            margin: 20px 0;
            background: #00d9ff;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: background 0.3s;
          }
          .button:hover {
            background: #00b8d9;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
          .security-note {
            background: #f8f9fa;
            border-left: 4px solid #00d9ff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🛡️ WhatCyber</h1>
        </div>
        <div class="content">
          <h2>Welcome, ${name}!</h2>
          <p>Thank you for registering with WhatCyber. To complete your registration and access your account, please verify your email address.</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          
          <div class="security-note">
            <strong>🔒 Security Note:</strong><br>
            This verification link will expire in 24 hours. If you didn't create an account with WhatCyber, you can safely ignore this email.
          </div>
          
          <p>If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #00d9ff;">${verificationUrl}</p>
        </div>
        <div class="footer">
          <p>© 2025 WhatCyber. All rights reserved.</p>
          <p>Stay secure, stay informed.</p>
        </div>
      </body>
      </html>
    `)
    .setText(`
      Welcome to WhatCyber!
      
      Hi ${name},
      
      Thank you for registering with WhatCyber. To complete your registration, please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with WhatCyber, you can safely ignore this email.
      
      Stay secure, stay informed.
      © 2025 WhatCyber
    `);

  try {
    await mailerSend.email.send(emailParams);
    console.log('✅ Verification email sent to:', to);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send password reset email
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
  
  const sentFrom = new Sender(SENDER_EMAIL, SENDER_NAME);
  const recipients = [new Recipient(to, name)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject('Reset your WhatCyber password')
    .setHtml(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%);
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: #00d9ff;
            margin: 0;
            font-size: 28px;
          }
          .content {
            background: #ffffff;
            padding: 40px 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            margin: 20px 0;
            background: #00d9ff;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: background 0.3s;
          }
          .button:hover {
            background: #00b8d9;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🛡️ WhatCyber</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password for your WhatCyber account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong><br>
            This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.
          </div>
          
          <p>If the button above doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #00d9ff;">${resetUrl}</p>
        </div>
        <div class="footer">
          <p>© 2025 WhatCyber. All rights reserved.</p>
          <p>Stay secure, stay informed.</p>
        </div>
      </body>
      </html>
    `)
    .setText(`
      Password Reset Request
      
      Hi ${name},
      
      We received a request to reset your password for your WhatCyber account. Click the link below to create a new password:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
      
      Stay secure, stay informed.
      © 2025 WhatCyber
    `);

  try {
    await mailerSend.email.send(emailParams);
    console.log('✅ Password reset email sent to:', to);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send welcome email after successful verification
 * @param to Recipient email address
 * @param name Recipient name
 */
export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  const sentFrom = new Sender(SENDER_EMAIL, SENDER_NAME);
  const recipients = [new Recipient(to, name)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject('Welcome to WhatCyber!')
    .setHtml(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%);
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: #00d9ff;
            margin: 0;
            font-size: 28px;
          }
          .content {
            background: #ffffff;
            padding: 40px 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            margin: 20px 0;
            background: #00d9ff;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
          }
          .feature-list {
            list-style: none;
            padding: 0;
          }
          .feature-list li {
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🛡️ WhatCyber</h1>
        </div>
        <div class="content">
          <h2>Welcome aboard, ${name}!</h2>
          <p>Your account has been successfully verified. You're now part of the WhatCyber community!</p>
          
          <h3>What you can do now:</h3>
          <ul class="feature-list">
            <li>📰 Access curated threat intelligence from 25+ sources</li>
            <li>🔖 Bookmark important articles for later</li>
            <li>🎯 Filter by threat levels and categories</li>
            <li>🔍 Search through security news</li>
            <li>🛡️ Monitor CVEs and vulnerabilities</li>
            <li>⚙️ Customize your feed preferences</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${BASE_URL}" class="button">Start Exploring</a>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 WhatCyber. All rights reserved.</p>
          <p>Stay secure, stay informed.</p>
        </div>
      </body>
      </html>
    `)
    .setText(`
      Welcome to WhatCyber!
      
      Hi ${name},
      
      Your account has been successfully verified. You're now part of the WhatCyber community!
      
      What you can do now:
      - Access curated threat intelligence from 25+ sources
      - Bookmark important articles for later
      - Filter by threat levels and categories
      - Search through security news
      - Monitor CVEs and vulnerabilities
      - Customize your feed preferences
      
      Start exploring: ${BASE_URL}
      
      Stay secure, stay informed.
      © 2025 WhatCyber
    `);

  try {
    await mailerSend.email.send(emailParams);
    console.log('✅ Welcome email sent to:', to);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error for welcome email, it's not critical
  }
}
