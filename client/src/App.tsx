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
    // Increment visitor count on app load through our proxy endpoint
    const incrementVisitorCount = async () => {
      try {
        // Use our server-side proxy to avoid CORS issues
        const response = await fetch('/api/counter/increment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to increment visitor count:', errorData);
          // Fallback to localStorage
          const localCount = localStorage.getItem('visitorCount');
          const newCount = localCount ? parseInt(localCount, 10) + 1 : 1;
          localStorage.setItem('visitorCount', newCount.toString());
        }
      } catch (error) {
        console.error('Network error incrementing visitor count:', error);
        // Fallback to localStorage
        const localCount = localStorage.getItem('visitorCount');
        const newCount = localCount ? parseInt(localCount, 10) + 1 : 1;
        localStorage.setItem('visitorCount', newCount.toString());
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