import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/home";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { Footer } from "@/components/footer";
import { useEffect, useState, createContext, useContext } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { LoginPopup } from "@/components/login-popup";
import { getAuthenticatedUser, isGuestUser, updateAuthToken } from "@/lib/auth";

// Create context for login popup
interface LoginPopupContextType {
  showLoginPopup: () => void;
}

const LoginPopupContext = createContext<LoginPopupContextType | null>(null);

export const useLoginPopup = () => {
  const context = useContext(LoginPopupContext);
  if (!context) {
    throw new Error('useLoginPopup must be used within LoginPopupProvider');
  }
  return context;
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [userChecked, setUserChecked] = useState(false);

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
    // Check if user is authenticated or has chosen to continue as guest
    const checkAuthStatus = () => {
      const user = getAuthenticatedUser();
      const guest = isGuestUser();
      
      if (!user && !guest) {
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

    // Increment visitor count on app load through our backend proxy
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

    // Cleanup interval
    return () => clearInterval(interval);
  }, []);

  const handleContinueAsGuest = () => {
    setShowLoginPopup(false);
    // Set a flag in localStorage to remember user's choice
    localStorage.setItem('guestUser', 'true');
  };

  const handleLogin = () => {
    setShowLoginPopup(false);
    // Remove guest flag if user logs in
    localStorage.removeItem('guestUser');
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
                onContinueAsGuest={handleContinueAsGuest} 
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