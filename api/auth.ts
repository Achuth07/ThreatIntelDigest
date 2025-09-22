import { VercelRequest, VercelResponse } from '@vercel/node';

async function handleGoogleCallback(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  
  if (!code) {
    // If there's no code, redirect to the frontend with an error
    res.redirect('https://threatfeed.whatcyber.com?error=authentication_failed');
    return;
  }
  
  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: 'https://threatfeed.whatcyber.com/api/auth?action=callback',
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get user profile information
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!profileResponse.ok) {
      throw new Error(`Profile fetch failed: ${profileResponse.status}`);
    }
    
    const profile = await profileResponse.json();
    
    // In a real implementation, we would create a session or JWT here
    // For now, we'll just redirect to the frontend with the user data in the URL
    // Note: This is not secure for production, but works for demonstration
    const userData = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.picture,
    };
    
    // Redirect to frontend with user data (URL encoded)
    const userDataString = encodeURIComponent(JSON.stringify(userData));
    res.redirect(`https://threatfeed.whatcyber.com?user=${userDataString}`);
  } catch (error) {
    console.error('Authentication error:', error);
    res.redirect('https://threatfeed.whatcyber.com?error=authentication_failed');
  }
}

async function handleGoogleLogin(req: VercelRequest, res: VercelResponse) {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID || ''}` +
    `&redirect_uri=https://threatfeed.whatcyber.com/api/auth?action=callback` +
    `&response_type=code` +
    `&scope=openid%20email%20profile` +
    `&access_type=offline`;
  
  res.redirect(googleAuthUrl);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;
  
  switch (action) {
    case 'google':
      return handleGoogleLogin(req, res);
    case 'callback':
      return handleGoogleCallback(req, res);
    default:
      res.status(400).json({ error: 'Invalid action parameter' });
  }
}