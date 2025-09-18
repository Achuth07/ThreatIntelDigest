import { useEffect, useState } from 'react';

export function Footer() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchVisitorCount = async () => {
      try {
        // Use our backend proxy endpoint to avoid CORS issues
        const response = await fetch('/api/visitor-count');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch visitor count: ${response.status}`);
        }

        const data = await response.json();
        setVisitorCount(data.count);
      } catch (error) {
        console.error('Error fetching visitor count:', error);
        // Fallback to localStorage if API fails
        const stored = localStorage.getItem('visitorCount');
        if (stored) {
          setVisitorCount(parseInt(stored));
        }
      }
    };

    fetchVisitorCount();
  }, []);

  return (
    <footer className="py-6 md:px-8 md:py-0 border-t">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 WhatCyber.com. All rights reserved.
          </p>
        </div>
        {visitorCount !== null && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Visitors: {visitorCount}
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}