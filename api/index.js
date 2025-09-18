import { createServer } from 'http';

// Import the Express app from your built server
let app;

try {
  // Try to import the app from the built server
  const serverModule = await import('../dist/index.js');
  app = serverModule.app;
  
  if (!app) {
    // If app is not directly exported, try to get it from default export
    app = serverModule.default;
  }
  
  if (!app) {
    // If still not found, throw an error
    throw new Error('Could not find Express app in dist/index.js');
  }
} catch (error) {
  console.error('Error importing Express app:', error);
  // Fallback to a simple Express app if import fails
  const express = (await import('express')).default;
  app = express();
  app.use(express.json());
  
  // Add a simple test route
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API handler working' });
  });
}

// Create HTTP server
const server = createServer(app);

export default async function handler(req, res) {
  // Forward the Vercel request to the Express server
  server.emit('request', req, res);
}