import { useState, useEffect } from 'react';

export function VisitorCounterTest() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testCounter = async () => {
      try {
        console.log('Testing CounterAPI through proxy endpoint...');
        const response = await fetch('/api/counter');
        console.log('Proxy response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Proxy response data:', data);
          setCount(data.value || data.count || 0);
        } else {
          const errorData = await response.json();
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('CounterAPI proxy test error:', err);
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