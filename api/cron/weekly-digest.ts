import type { VercelRequest, VercelResponse } from '@vercel/node';
import { digestService } from '../../server/services/digest-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify cron secret
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await digestService.generateWeeklyDigest();
        res.status(200).json({
            message: 'Weekly digest generation completed',
            stats: result
        });
    } catch (error) {
        console.error('Weekly digest error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
