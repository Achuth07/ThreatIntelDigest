import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

const SENDER_EMAIL = 'contact@whatcyber.com';
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
  
  console.log('📧 Preparing to send verification email:', {
    to,
    from: SENDER_EMAIL,
    templateId: VERIFICATION_TEMPLATE_ID,
    verificationUrl
  });
  
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
    const response = await mailerSend.email.send(emailParams);
    console.log('✅ Verification email sent successfully:', { to, response });
  } catch (error: any) {
    console.error('❌ Error sending verification email:', {
      to,
      statusCode: error?.statusCode,
      message: error?.body?.message,
      errors: error?.body?.errors,
      fullError: error
    });
    
    // Check if it's a MailerSend trial account limitation
    if (error?.body?.message?.includes('Trial accounts can only send emails')) {
      throw new Error('Email verification is temporarily unavailable. Please contact support or try again later.');
    }
    
    // Check if it's a domain verification issue
    if (error?.body?.errors?.['from.email']) {
      throw new Error('Email configuration error. Please contact support.');
    }
    
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
  } catch (error: any) {
    console.error('❌ Error sending password reset email:', error);
    
    // Check if it's a MailerSend trial account limitation
    if (error?.body?.message?.includes('Trial accounts can only send emails')) {
      throw new Error('Password reset email is temporarily unavailable. Please contact support or try again later.');
    }
    
    throw new Error('Failed to send password reset email');
  }
}
