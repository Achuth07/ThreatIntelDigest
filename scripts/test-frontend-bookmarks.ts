import { getAuthenticatedUser } from '../client/src/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock localStorage for Node.js environment
const mockLocalStorage: Record<string, string> = {};

// Try to read the user data from localStorage file if it exists
try {
  const localStoragePath = join(process.cwd(), '.localstorage');
  if (require('fs').existsSync(localStoragePath)) {
    const localStorageData = JSON.parse(readFileSync(localStoragePath, 'utf-8'));
    Object.assign(mockLocalStorage, localStorageData);
  }
} catch (error) {
  console.log('No localStorage file found or error reading it');
}

// Mock getAuthenticatedUser to use our mock localStorage
function mockGetAuthenticatedUser(): any | null {
  try {
    const storedUser = mockLocalStorage['cyberfeed_user'];
    if (!storedUser) {
      console.log('No user found in localStorage');
      return null;
    }

    const userData = JSON.parse(storedUser);
    
    // Check if token exists
    if (!userData.token) {
      console.log('No token found in user data');
      return null;
    }
    
    // Parse token payload
    const payload = JSON.parse(atob(userData.token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (payload.exp && currentTime > payload.exp) {
      // Token expired
      console.log('Token is expired');
      return null;
    }
    
    console.log('User authenticated:', userData);
    return userData;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return null;
  }
}

async function testBookmarksAPI() {
  console.log('Testing bookmarks API with authentication...');
  
  // Check if user is authenticated
  const user = mockGetAuthenticatedUser();
  
  if (!user) {
    console.log('User is not authenticated, bookmarks API will return empty array');
    return;
  }
  
  // Test the bookmarks API with the user's token
  try {
    const headers: Record<string, string> = {};
    if (user.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }
    
    console.log('Making request with headers:', headers);
    
    const response = await fetch('http://localhost:5001/api/bookmarks', {
      headers
    });
    
    console.log('Response status:', response.status);
    const bookmarks = await response.json();
    console.log('Bookmarks:', bookmarks);
    console.log('Bookmark count:', bookmarks.length);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
  }
}

testBookmarksAPI();