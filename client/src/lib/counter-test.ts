// Test file to verify CounterAPI endpoint construction
import { Counter } from 'counterapi';

// Test the CounterAPI client configuration
export function testCounterAPIEndpoint() {
  try {
    // Create a CounterAPI client with your configuration
    const counter = new Counter({
      version: 'v1',
      namespace: 'threatfeed',
    });

    console.log('CounterAPI client created successfully');
    console.log('Namespace:', counter.namespace);
    
    // Note: The actual endpoint construction is handled internally by the CounterAPI client
    // The endpoint should be: https://counterapi.com/api/v1/threatfeed/visitorstothreatfeed/up
    // when calling counter.up('visitorstothreatfeed')
    
    return true;
  } catch (error) {
    console.error('Error creating CounterAPI client:', error);
    return false;
  }
}