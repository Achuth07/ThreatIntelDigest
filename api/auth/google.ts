import { VercelRequest, VercelResponse } from '@vercel/node';
import passport from '../../server/auth/google-auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // For Google OAuth, we need to redirect to Google's OAuth endpoint
  // This is a simplified version that just redirects to the Google OAuth URL
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&` +
    `response_type=code&` +
    `scope=profile email&` +
    `access_type=offline`;

  res.redirect(googleAuthUrl);
}