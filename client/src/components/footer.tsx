import { useState, useEffect } from 'react';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitorCount = async () => {
      try {
        // Use our server-side proxy to avoid CORS issues
        const response = await fetch('/api/counter');
        
        if (response.ok) {
          const data = await response.json();
          console.log('Counter API response:', data);
          // Use the count field from the response
          setVisitorCount(data.count || 0);
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch visitor count:', errorData);
          // Fallback to localStorage
          const localCount = localStorage.getItem('visitorCount');
          setVisitorCount(localCount ? parseInt(localCount, 10) : 0);
        }
      } catch (error) {
        console.error('Network error fetching visitor count:', error);
        // Fallback to localStorage
        const localCount = localStorage.getItem('visitorCount');
        setVisitorCount(localCount ? parseInt(localCount, 10) : 0);
      } finally {
        setLoading(false);
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
              {loading ? (
                <span>Loading visitor count...</span>
              ) : (
                <span>
                  Visitors: <span className="font-semibold text-slate-200">{visitorCount?.toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}