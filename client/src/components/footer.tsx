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
        // Direct API call to CounterAPI with the correct endpoint
        const response = await fetch('https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed');
        if (response.ok) {
          const data = await response.json();
          setVisitorCount(data.value || 0);
        } else {
          console.error('Failed to fetch visitor count:', response.status);
          setVisitorCount(0);
        }
      } catch (error) {
        console.error('Error fetching visitor count:', error);
        setVisitorCount(0);
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