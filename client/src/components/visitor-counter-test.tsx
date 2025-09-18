import { useState, useEffect } from 'react';
import { Counter } from 'counterapi';

export function VisitorCounterTest() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testCounter = async () => {
      try {
        // Initialize CounterAPI V1 client with your specific workspace
        const counter = new Counter({
          version: 'v1',
          namespace: 'threatfeed', // Your workspace name
        });

        // Try to get the counter value using your specific counter slug
        const result = await counter.get('visitorstothreatfeed');
        setCount(result.value);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('CounterAPI test error:', err);
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