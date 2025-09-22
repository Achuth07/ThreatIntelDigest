import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Return user profile information
    if ((req as any).user) {
      return res.json({
        isAuthenticated: true,
        user: {
          id: (req as any).user.id,
          name: (req as any).user.name,
          email: (req as any).user.email,
          avatar: (req as any).user.avatar
        }
      });
    } else {
      return res.json({ isAuthenticated: false });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}