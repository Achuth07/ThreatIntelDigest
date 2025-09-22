// Load environment variables
if (process.env.NODE_ENV === 'development') {
  try {
    const { config } = await import('dotenv');
    config();
  } catch (error) {
    console.warn('dotenv not available or failed to load .env file');
  }
}

// Debug environment variables
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '[SET]' : '[NOT SET]');
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Profile, VerifyCallback } from 'passport-google-oauth20';

// Define User interface
interface User {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: Date;
}

// Mock user storage (in a real application, this would be a database)
const users: User[] = [];

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 
    (process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5001/api/auth/callback/google' 
      : 'https://threatfeed.whatcyber.com/api/auth/callback/google')
}, async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
  try {
    // Check if user already exists in our database
    let user = users.find(u => u.googleId === profile.id);
    
    if (user) {
      // User already exists, update their information
      user.name = profile.displayName || '';
      user.email = profile.emails?.[0]?.value || '';
      user.avatar = profile.photos?.[0]?.value || '';
    } else {
      // Create new user
      user = {
        id: profile.id,
        googleId: profile.id,
        name: profile.displayName || '',
        email: profile.emails?.[0]?.value || '',
        avatar: profile.photos?.[0]?.value || '',
        createdAt: new Date()
      };
      users.push(user);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error as Error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id: string, done: (err: any, user?: any) => void) => {
  const user = users.find(u => u.id === id);
  done(null, user || false);
});

export default passport;