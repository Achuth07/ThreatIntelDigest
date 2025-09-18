import { useState, useEffect } from 'react';

export function VisitorCounterTest() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testCounter = async () => {
      try {
        // Direct API call to CounterAPI with the correct endpoint
        const response = await fetch('https://counterapi.com/api/v1/threatfeed/visitorstothreatfeed');
        if (response.ok) {
          const data = await response.json();
          setCount(data.value || 0);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('CounterAPI test error:', err);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    testCounter();
  }, []);

  return (
    <div className="p-4 bg-slate-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Visitor Counter Test</h3>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-400">Error: {error}</p>
      ) : (
        <p>Current visitor count: {count}</p>
      )}
    </div>
  );
}