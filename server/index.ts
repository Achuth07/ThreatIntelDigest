import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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
        : 'https://threatfeed.whatcyber.com';
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
          : 'https://threatfeed.whatcyber.com';
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
      req.session?.destroy(() => {});
      res.json({ message: 'Logged out successfully' });
    });
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

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})();
