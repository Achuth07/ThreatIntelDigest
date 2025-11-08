import { apiRequest } from './queryClient';
import type { RssSource } from '@shared/schema';

// Default sources for new users
export const DEFAULT_USER_SOURCES = [
  'Bleeping Computer',
  'Microsoft Security Blog', 
  'The DFIR Report',
  'Unit 42',
  'The Hacker News'
];

/**
 * Initialize default sources for a new user
 * @param userId The user ID
 * @returns Promise that resolves when default sources are set up
 */
export async function initializeUserSources(userId: number): Promise<void> {
  try {
    // Get all available sources
    const response = await apiRequest('GET', '/api/sources');
    const allSources: RssSource[] = await response.json();
    
    // Find the default sources by name
    const defaultSources = allSources.filter(source => 
      DEFAULT_USER_SOURCES.includes(source.name)
    );
    
    // For each default source, create a user preference with isActive=true
    for (const source of defaultSources) {
      await apiRequest('POST', '/api/user-source-preferences', {
        sourceId: source.id,
        isActive: true
      });
    }
    
    console.log(`Initialized ${defaultSources.length} default sources for user ${userId}`);
  } catch (error) {
    console.error('Error initializing user sources:', error);
    throw error;
  }
}

/**
 * Check if user has any source preferences
 * @param userId The user ID
 * @returns Promise that resolves to true if user has preferences, false otherwise
 */
export async function hasUserSourcePreferences(userId: number): Promise<boolean> {
  try {
    const response = await apiRequest('GET', '/api/user-source-preferences');
    const preferences = await response.json();
    return preferences.length > 0;
  } catch (error) {
    console.error('Error checking user source preferences:', error);
    return false;
  }
}