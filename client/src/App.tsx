import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import { Footer } from "@/components/footer";
import { Suspense, lazy, useEffect, useState } from "react";
import { getAuthenticatedUser, updateAuthToken } from "@/lib/auth";
import { SEO } from "@/components/seo";
import { RouteErrorBoundary } from "@/components/error-boundary";
import LandingPage from "@/pages/landing-page";
import { KofiBanner } from "@/components/kofi-banner";


// Import context from separate file to prevent HMR issues
import { LoginPopupContext, useLoginPopup } from "@/contexts/login-popup-context";
export { useLoginPopup };

// Pages load on demand so the first visit downloads only the code for the page being opened.
const Home = lazy(() => import("@/pages/home"));
const Settings = lazy(() => import("@/pages/settings"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const SetPasswordPage = lazy(() => import("@/pages/set-password"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const SourcesPage = lazy(() => import("@/pages/SourcesPage"));
const ContactPage = lazy(() => import("@/pages/contact"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy"));
const TermsOfServicePage = lazy(() => import("@/pages/terms"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const ReportBugs = lazy(() => import("@/pages/report-bugs"));
const ArticlePage = lazy(() => import("@/pages/ArticlePage"));
const ThreatActorsPage = lazy(() => import("@/pages/threat-actors"));
const ThreatActorDetailPage = lazy(() => import("@/pages/threat-actor-detail"));
const ExploitedVulnerabilitiesPage = lazy(() => import("@/pages/exploited-vulnerabilities"));
const CVEDetailPage = lazy(() => import("@/pages/cve-detail"));
const VulnerabilitiesPage = lazy(() => import("@/pages/vulnerabilities"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const WatchlistPage = lazy(() => import("@/pages/watchlist"));
const AdminDashboard = lazy(() => import("@/components/admin-dashboard").then((m) => ({ default: m.AdminDashboard })));
const LoginPopup = lazy(() => import("@/components/login-popup").then((m) => ({ default: m.LoginPopup })));

// Fills the screen so the footer stays below the fold until the page arrives (no layout shift).
const PageFallback = () => (
  <div className="flex flex-1 items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-whatcyber-teal"></div>
  </div>
);

// ScrollToTop component to handle automatic scrolling on route changes
const ScrollToTop = () => {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll to top of page when location changes
    window.scrollTo(0, 0);
  }, [location]);

  return null;
};

function Router() {
  const [location] = useLocation();

  return (
    <>
      <SEO />
      <ScrollToTop />
      <RouteErrorBoundary resetKey={location}>
      <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/threatfeed" component={Home} />
        <Route path="/watchlist" component={WatchlistPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/set-password" component={SetPasswordPage} />
        <Route path="/settings">
          {() => {
            const user = getAuthenticatedUser();
            if (!user) {
              // Redirect to home page if not authenticated
              window.location.href = '/';
              return null;
            }
            // Allow all users (including guests) to access settings page
            // The settings component will handle showing the login popup for guests
            return <Settings />;
          }}
        </Route>
        <Route path="/admin">
          {() => {
            const user = getAuthenticatedUser();
            if (!user || !user.isAdmin) {
              // Redirect to home page if not authenticated or not admin
              window.location.href = '/';
              return null;
            }
            return <AdminDashboard />;
          }}
        </Route>
        <Route path="/about" component={AboutPage} />
        <Route path="/sources" component={SourcesPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/privacy" component={PrivacyPolicyPage} />
        <Route path="/terms" component={TermsOfServicePage} />
        <Route path="/report-bugs" component={ReportBugs} />
        <Route path="/article/:id" component={ArticlePage} />

        <Route path="/threat-actors" component={ThreatActorsPage} />
        <Route path="/threat-actors/:id" component={ThreatActorDetailPage} />
        <Route path="/cisa-kev" component={ExploitedVulnerabilitiesPage} />
        <Route path="/cve" component={VulnerabilitiesPage} />
        <Route path="/cve/:id" component={CVEDetailPage} />
        {/* Old addresses. The server answers these with a permanent redirect; this covers in-app links and local dev. */}
        <Route path="/exploited-vulnerabilities">{() => <Redirect to="/cisa-kev" replace />}</Route>
        <Route path="/exploited-vulnerabilities/:id">{(params) => <Redirect to={`/cve/${params.id}`} replace />}</Route>
        <Route path="/vulnerabilities">{() => <Redirect to="/cve" replace />}</Route>
        <Route path="/vulnerabilities/:id">{(params) => <Redirect to={`/cve/${params.id}`} replace />}</Route>
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route component={NotFound} />
      </Switch>
      {/* Inside the Suspense so the footer appears together with the page, not before it. */}
      <Footer />
      </Suspense>
      </RouteErrorBoundary>
    </>
  );
}

function App() {
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    // Set the document title
    document.title = "WhatCyber - ThreatFeed";

    // Handle OAuth redirect parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const errorParam = urlParams.get('error');

    if (userParam) {
      try {
        // Decode and parse user data
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('App.tsx - OAuth callback - User data:', userData);

        // Store user data in localStorage
        updateAuthToken(userData);

        // Remove URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);

        // Check if user needs onboarding
        if (!userData.hasOnboarded) {
          console.log('App.tsx - User needs onboarding, redirecting to /onboarding');
          window.location.href = '/onboarding';
        } else {
          console.log('App.tsx - User has onboarded, staying on current page');
        }
      } catch (error) {
        console.error('Error parsing user data from URL:', error);
      }
    }

    if (errorParam) {
      console.error('OAuth error:', errorParam);
      // Remove URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // The login popup covers account pages only. Public pages such as /threatfeed stay readable
    // without signing in; sign-in is requested when a visitor saves or follows something.
    const shouldShowLoginPopup = location.startsWith('/set-password') ||
      location.startsWith('/settings') ||
      location.startsWith('/admin');

    if (shouldShowLoginPopup) {
      // Check if user is authenticated - only show login if not authenticated
      const checkAuthStatus = () => {
        const user = getAuthenticatedUser();

        if (!user) {
          setShowLoginPopup(true);
        } else {
          setShowLoginPopup(false);
        }
        setUserChecked(true);
      };

      // Check auth status immediately
      checkAuthStatus();

      // Also check periodically in case of login/logout events
      const interval = setInterval(checkAuthStatus, 1000);

      // Cleanup interval
      return () => clearInterval(interval);
    } else {
      // Public routes: no login popup, mark user as checked
      setShowLoginPopup(false);
      setUserChecked(true);

      // Still increment visitor count on app load through our backend proxy
      const incrementVisitorCount = async () => {
        try {
          // Use the correct endpoint for both development and production
          const response = await fetch('/api/visitor-count', {
            method: 'POST'
          });

          if (!response.ok) {
            throw new Error(`Counter API proxy failed: ${response.status}`);
          }

          const data = await response.json();
          // The counter is automatically incremented by the API call
          // We don't need to do anything with the response data here
          // The footer component will fetch the updated count
        } catch (error) {
          console.error('Error incrementing visitor count:', error);
          // Fallback to localStorage
          const stored = localStorage.getItem('visitorCount');
          const count = stored ? parseInt(stored) + 1 : 1;
          localStorage.setItem('visitorCount', count.toString());
        }
      };

      incrementVisitorCount();
    }
  }, [location]);

  const handleLogin = () => {
    setShowLoginPopup(false);
  };

  // Don't render the app until we've checked for authentication
  if (!userChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-whatcyber-darker">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatcyber-teal"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <LoginPopupContext.Provider value={{ showLoginPopup: () => setShowLoginPopup(true) }}>
            <Toaster />
            {showLoginPopup && (
              <Suspense fallback={null}>
                <LoginPopup
                  onLogin={handleLogin}
                />
              </Suspense>
            )}
            <div className="flex flex-col min-h-screen">
              <KofiBanner />
              <Router />
            </div>
          </LoginPopupContext.Provider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;