import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllUsers, getUserStatistics } from '../server/user-tracking';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Check if user wants statistics or all users
      const { stats } = req.query;
      
      if (stats === 'true') {
        // Get user statistics
        const statsData = await getUserStatistics();
        res.status(200).json(statsData);
      } else {
        // Get all users
        const users = await getAllUsers();
        res.status(200).json(users);
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in user management endpoint:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}