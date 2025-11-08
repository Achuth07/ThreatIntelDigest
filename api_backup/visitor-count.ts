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
    if (req.method === 'POST') {
      // Increment visitor count using CounterAPI v1 (no authentication needed)
      // Added trailing slash to avoid 301 redirect that causes CORS issues
      const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up/`;
      
      const response = await fetch(counterUrl, {
        method: 'GET'  // CounterAPI v1 uses GET for incrementing
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v1 increment failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v1 increment failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      res.status(200).json(data);
    } else if (req.method === 'GET') {
      // Get visitor count using CounterAPI v1 (no authentication needed)
      // Added trailing slash to avoid 301 redirect that causes CORS issues
      const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/`;
      
      const response = await fetch(counterUrl, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`CounterAPI v1 fetch failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`CounterAPI v1 fetch failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Visitor count API error:', error);
    res.status(500).json({ error: 'Failed to process visitor count request', details: error.message });
  }
}