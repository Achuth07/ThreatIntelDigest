import { useState, useEffect } from 'react';

export function VisitorCounterTest() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testCounter = async () => {
      try {
        console.log('Testing CounterAPI endpoint...');
        const response = await fetch('https://api.counterapi.dev/v1/threatfeed/visitorstothreatfeed');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Response data:', data);
          setCount(data.value || 0);
        } else {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
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