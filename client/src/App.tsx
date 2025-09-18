import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { Footer } from "@/components/footer";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Increment visitor count on app load through CounterAPI
    const incrementVisitorCount = async () => {
      try {
        // Use simple CounterAPI without authentication (public endpoint)
        const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed/up`;

        const response = await fetch(counterUrl, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error(`Counter API failed: ${response.status}`);
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
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Router />
            <Footer />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;