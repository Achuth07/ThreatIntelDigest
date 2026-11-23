// Vercel function for the public v1 API (WHA-38). The app itself is in server/api-v1/app.ts.
// vercel.json sends api.whatcyber.com/* and /api/v1/* here.
import { handle } from '@hono/node-server/vercel';
import { app } from '../server/api-v1/app.js';

export const config = { api: { bodyParser: false } };

export default handle(app);
