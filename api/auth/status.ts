import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check if user is authenticated
  // In a real implementation, we would check the session or JWT
  // For now, we'll always return unauthenticated
  res.json({ isAuthenticated: false });
}