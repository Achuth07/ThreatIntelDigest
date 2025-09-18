import { useState, useEffect } from 'react';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  const [visitorCount, setVisitorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVisitorCount = async () => {
      try {
        // Use simple CounterAPI without authentication (public endpoint)
        const counterUrl = `https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed`;

        const response = await fetch(counterUrl, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error(`Counter API failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.count !== undefined) {
          setVisitorCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching visitor count:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem('visitorCount');
        const count = stored ? parseInt(stored) : 0;
        setVisitorCount(count);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVisitorCount();
  }, []);

  return (
    <footer className={`bg-slate-800 border-t border-slate-700 py-6 ${className}`}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-slate-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} ThreatIntelDigest. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-slate-400 text-sm">
              {isLoading ? (
                <span>Loading visitor count...</span>
              ) : (
                <span>
                  Visitors: <span className="font-semibold text-slate-200">{visitorCount.toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}