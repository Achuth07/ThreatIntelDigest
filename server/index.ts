import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in development
if (process.env.NODE_ENV === 'development') {
  try {
    const { config } = await import('dotenv');
    config();
    console.log('Environment variables loaded from .env file');
  } catch (error) {
    console.warn('dotenv not available or failed to load .env file');
  }
}

// Import passport after environment variables are loaded
import passport from "./auth/google-auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_for_development',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Serve robots.txt and sitemap.xml
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/sitemap.xml'));
});

// Redirect middleware to enforce authoritative URL standard
app.use((req, res, next) => {
  const host = req.get('Host');
  const protocol = req.protocol;
  const path = req.path;
  const query = req.url.includes('?') ? req.url.split('?')[1] : '';

  // Redirect www to non-www
  if (host && host.startsWith('www.')) {
    const newHost = host.replace('www.', '');
    const redirectUrl = `https://${newHost}${req.url}`;
    return res.redirect(301, redirectUrl);
  }

  // Redirect HTTP to HTTPS in production
  if (process.env.NODE_ENV === 'production' && protocol !== 'https') {
    const redirectUrl = `https://${host || 'www.whatcyber.com'}${req.url}`;
    return res.redirect(301, redirectUrl);
  }

  // Redirect non-trailing-slash URLs to trailing-slash URLs (except for file extensions, API routes, and Vite internal paths)
  if (path !== '/' && !path.endsWith('/') && !path.includes('.') && !path.startsWith('/api/') && !path.startsWith('/@') && !req.query.noRedirect) {
    const redirectUrl = `${req.protocol}://${host || 'www.whatcyber.com'}${path}/${query ? `?${query}` : ''}`;
    return res.redirect(301, redirectUrl);
  }

  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize storage (PostgresStorage if DATABASE_URL is set)
  const { initializeStorage } = await import("./storage");
  await initializeStorage();

  const server = await registerRoutes(app);

  // Google OAuth routes
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/callback/google',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      // Successful authentication, redirect to frontend
      const frontendUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : 'https://www.whatcyber.com/threatfeed';
      res.redirect(frontendUrl);
    }
  );

  // Handle the new consolidated auth endpoint for local development
  app.get('/api/auth', (req, res, next) => {
    const { action } = req.query;

    if (action === 'callback') {
      // Handle Google OAuth callback
      passport.authenticate('google', { failureRedirect: '/' })(req, res, () => {
        // Successful authentication, redirect to frontend
        const frontendUrl = process.env.NODE_ENV === 'development'
          ? 'http://localhost:3001'
          : 'https://www.whatcyber.com/threatfeed';
        res.redirect(frontendUrl);
      });
    } else if (action === 'google') {
      // Handle Google OAuth initiation
      passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    } else {
      // For other actions, continue with normal routing
      next();
    }
  });

  // Logout route
  app.get('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      req.session?.destroy(() => { });
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Email authentication routes - these will be handled by consolidated API handler
  app.post('/api/auth/email/register', async (req, res) => {
    const { default: consolidatedApiHandler } = await import('../api/index');
    const mockReq = {
      method: 'POST',
      url: '/api/auth/email/register',
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };
    const mockRes = {
      status: (code: number) => { res.status(code); return mockRes; },
      json: (data: any) => { res.json(data); return mockRes; },
      send: (data: any) => { res.send(data); return mockRes; },
      setHeader: (name: string, value: string) => { res.setHeader(name, value); return mockRes; },
      end: () => { res.end(); return mockRes; },
      redirect: (url: string) => { res.redirect(url); return mockRes; }
    };
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });

  app.get('/api/auth/email/verify', async (req, res) => {
    const { default: consolidatedApiHandler } = await import('../api/index');
    const mockReq = {
      method: 'GET',
      url: '/api/auth/email/verify',
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };
    const mockRes = {
      status: (code: number) => { res.status(code); return mockRes; },
      json: (data: any) => { res.json(data); return mockRes; },
      send: (data: any) => { res.send(data); return mockRes; },
      setHeader: (name: string, value: string) => { res.setHeader(name, value); return mockRes; },
      end: () => { res.end(); return mockRes; },
      redirect: (url: string) => { res.redirect(url); return mockRes; }
    };
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });

  app.post('/api/auth/email/login', async (req, res) => {
    const { default: consolidatedApiHandler } = await import('../api/index');
    const mockReq = {
      method: 'POST',
      url: '/api/auth/email/login',
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };
    const mockRes = {
      status: (code: number) => { res.status(code); return mockRes; },
      json: (data: any) => { res.json(data); return mockRes; },
      send: (data: any) => { res.send(data); return mockRes; },
      setHeader: (name: string, value: string) => { res.setHeader(name, value); return mockRes; },
      end: () => { res.end(); return mockRes; },
      redirect: (url: string) => { res.redirect(url); return mockRes; }
    };
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });

  app.post('/api/auth/email/forgot-password', async (req, res) => {
    const { default: consolidatedApiHandler } = await import('../api/index');
    const mockReq = {
      method: 'POST',
      url: '/api/auth/email/forgot-password',
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };
    const mockRes = {
      status: (code: number) => { res.status(code); return mockRes; },
      json: (data: any) => { res.json(data); return mockRes; },
      send: (data: any) => { res.send(data); return mockRes; },
      setHeader: (name: string, value: string) => { res.setHeader(name, value); return mockRes; },
      end: () => { res.end(); return mockRes; },
      redirect: (url: string) => { res.redirect(url); return mockRes; }
    };
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });

  app.post('/api/auth/email/reset-password', async (req, res) => {
    const { default: consolidatedApiHandler } = await import('../api/index');
    const mockReq = {
      method: 'POST',
      url: '/api/auth/email/reset-password',
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };
    const mockRes = {
      status: (code: number) => { res.status(code); return mockRes; },
      json: (data: any) => { res.json(data); return mockRes; },
      send: (data: any) => { res.send(data); return mockRes; },
      setHeader: (name: string, value: string) => { res.setHeader(name, value); return mockRes; },
      end: () => { res.end(); return mockRes; },
      redirect: (url: string) => { res.redirect(url); return mockRes; }
    };
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });

  app.post('/api/auth/email/set-password', async (req, res) => {
    const { default: consolidatedApiHandler } = await import('../api/index');
    const mockReq = {
      method: 'POST',
      url: '/api/auth/email/set-password',
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };
    const mockRes = {
      status: (code: number) => { res.status(code); return mockRes; },
      json: (data: any) => { res.json(data); return mockRes; },
      send: (data: any) => { res.send(data); return mockRes; },
      setHeader: (name: string, value: string) => { res.setHeader(name, value); return mockRes; },
      end: () => { res.end(); return mockRes; },
      redirect: (url: string) => { res.redirect(url); return mockRes; }
    };
    await consolidatedApiHandler(mockReq as any, mockRes as any);
  });

  // Check authentication status
  app.get('/api/auth/status', (req, res) => {
    if (req.isAuthenticated()) {
      // Return user information
      res.json({
        isAuthenticated: true,
        user: {
          id: (req.user as any).id,
          name: (req.user as any).name,
          email: (req.user as any).email,
          avatar: (req.user as any).avatar
        }
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // Setup Vite or static serving
  if (process.env.NODE_ENV === "development" && !process.env.NO_VITE) {
    await setupVite(app, server);
  } else if (!process.env.NO_VITE) {
    serveStatic(app);
  }

  const port = process.env.PORT || 5002;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})();
