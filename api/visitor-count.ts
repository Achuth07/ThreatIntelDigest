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
    // Use CounterAPI v2 with token if available
    const apiToken = process.env.VITE_THREATFEED_COUNTER;
    
    if (req.method === 'POST') {
      // Increment visitor count
      if (apiToken) {
        // Use CounterAPI v2 with authentication
        const counterUrl = `https://api.counterapi.dev/v2/threatfeed/visitorstothreatfeed/up`;
        
        const response = await fetch(counterUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`CounterAPI v2 failed: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`CounterAPI v2 failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        res.status(200).json(data);
      } else {
        // Fallback to CounterAPI v1
        console.log('No API token found, using CounterAPI v1');
        const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up/`;
        
        const response = await fetch(counterUrl, {
          method: 'GET'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`CounterAPI v1 failed: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`CounterAPI v1 failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        res.status(200).json(data);
      }
    } else if (req.method === 'GET') {
      // Get visitor count
      if (apiToken) {
        // Use CounterAPI v2 with authentication
        const counterUrl = `https://api.counterapi.dev/v2/threatfeed/visitorstothreatfeed`;
        
        const response = await fetch(counterUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`CounterAPI v2 failed: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`CounterAPI v2 failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        res.status(200).json(data);
      } else {
        // Fallback to CounterAPI v1
        console.log('No API token found, using CounterAPI v1');
        const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/`;
        
        const response = await fetch(counterUrl, {
          method: 'GET'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`CounterAPI v1 failed: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`CounterAPI v1 failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        res.status(200).json(data);
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Visitor count API error:', error);
    res.status(500).json({ error: 'Failed to process visitor count request', details: error.message });
  }
}