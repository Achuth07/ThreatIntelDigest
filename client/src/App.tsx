import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/home";
import Settings from "@/pages/settings";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import SetPasswordPage from "@/pages/set-password";
import NotFound from "@/pages/not-found";
import { Footer } from "@/components/footer";
import { useEffect, useState, createContext, useContext } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { LoginPopup } from "@/components/login-popup";
import { getAuthenticatedUser, updateAuthToken } from "@/lib/auth";
import { SEO } from "@/components/seo";
import LandingPage from "@/pages/landing-page";
import AboutPage from "@/pages/AboutPage";
import SourcesPage from "@/pages/SourcesPage";
import ContactPage from "@/pages/contact";
import PrivacyPolicyPage from "@/pages/privacy";
import TermsOfServicePage from "@/pages/terms";

// Create context for login popup
interface LoginPopupContextType {
  showLoginPopup: () => void;
}

export const LoginPopupContext = createContext<LoginPopupContextType | null>(null);

export const useLoginPopup = () => {
  const context = useContext(LoginPopupContext);
  if (!context) {
    throw new Error('useLoginPopup must be used within LoginPopupProvider');
  }
  return context;
};

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
  return (
    <>
      <SEO />
      <ScrollToTop />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/threatfeed" component={Home} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
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
        <Route component={NotFound} />
      </Switch>
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
        // Store user data in localStorage
        updateAuthToken(userData);
        // Remove URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
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
    // Only show login popup on threatfeed routes
    const shouldShowLoginPopup = location.startsWith('/threatfeed') || 
                                location.startsWith('/login') || 
                                location.startsWith('/register') || 
                                location.startsWith('/forgot-password') || 
                                location.startsWith('/reset-password') || 
                                location.startsWith('/set-password') || 
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
      // For non-threatfeed routes, don't show login popup and mark user as checked
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
              <LoginPopup 
                onLogin={handleLogin} 
              />
            )}
            <div className="flex flex-col min-h-screen">
              <Router />
              <Footer />
            </div>
          </LoginPopupContext.Provider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;