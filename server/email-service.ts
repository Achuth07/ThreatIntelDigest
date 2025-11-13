import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

const SENDER_EMAIL = 'noreply@whatcyber.com';
const SENDER_NAME = 'WhatCyber';
const BASE_URL = process.env.VERCEL_ENV === 'production' 
  ? 'https://threatfeed.whatcyber.com' 
  : 'http://localhost:5173';

// MailerSend Template IDs
const VERIFICATION_TEMPLATE_ID = 'x2p034709jkgzdrn';
const PASSWORD_RESET_TEMPLATE_ID = 'zr6ke4n69qylon12';

/**
 * Send email verification email using MailerSend template
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
    .setTemplateId(VERIFICATION_TEMPLATE_ID)
    .setPersonalization([
      {
        email: to,
        data: {
          name: name,
          verification_url: verificationUrl
        }
      }
    ]);

  try {
    await mailerSend.email.send(emailParams);
    console.log('✅ Verification email sent to:', to);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send password reset email using MailerSend template
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
    .setTemplateId(PASSWORD_RESET_TEMPLATE_ID)
    .setPersonalization([
      {
        email: to,
        data: {
          name: name,
          reset_url: resetUrl
        }
      }
    ]);

  try {
    await mailerSend.email.send(emailParams);
    console.log('✅ Password reset email sent to:', to);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
