import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the origin from the request
  const origin = req.headers.origin || '*';
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Vary', 'Origin'); // Important for CORS with multiple origins

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const apiToken = process.env.VITE_THREATFEED_COUNTER || process.env.COUNTERAPI_TOKEN;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    if (req.method === 'POST') {
      const counterUrl = `https://api.counterapi.dev/v2/threatfeed/visitorstothreatfeed/up`;
      
      const response = await fetch(counterUrl, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v2 increment failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v2 increment failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      const count = data.data?.up_count ?? data.up_count ?? data.count ?? 0;
      res.status(200).json({ ...data, count });
    } else if (req.method === 'GET') {
      const counterUrl = `https://api.counterapi.dev/v2/threatfeed/visitorstothreatfeed`;
      
      const response = await fetch(counterUrl, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v2 fetch failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v2 fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      const count = data.data?.up_count ?? data.up_count ?? data.count ?? 0;
      res.status(200).json({ ...data, count });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Visitor count API error:', error);
    res.status(500).json({ error: 'Failed to process visitor count request', details: error.message });
  }
}