/**
 * Authentication utility functions
 */

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isAdmin?: boolean;
  token?: string;
  isGuest?: boolean;
}

/**
 * Check if user is authenticated and token is valid
 * @returns User object if authenticated, null otherwise
 */
export function getAuthenticatedUser(): User | null {
  try {
    // Check for guest user first
    const isGuest = localStorage.getItem('guestToken');
    if (isGuest === 'true') {
      return {
        id: 'guest',
        name: 'Guest User',
        email: 'guest@whatcyber.com',
        avatar: '',
        isGuest: true
      };
    }

    const storedUser = localStorage.getItem('cyberfeed_user');
    if (!storedUser) {
      return null;
    }

    const userData: User = JSON.parse(storedUser);
    
    // Check if token exists
    if (!userData.token) {
      return null;
    }
    
    // Parse token payload
    const payload = JSON.parse(atob(userData.token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (payload.exp && currentTime > payload.exp) {
      // Token expired, remove user data
      localStorage.removeItem('cyberfeed_user');
      return null;
    }
    
    return userData;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    // Remove invalid user data
    localStorage.removeItem('cyberfeed_user');
    return null;
  }
}

/**
 * Update user token in localStorage
 * @param user User object with new token
 */
export function updateAuthToken(user: User): void {
  try {
    localStorage.setItem('cyberfeed_user', JSON.stringify(user));
  } catch (error) {
    console.error('Error updating auth token:', error);
  }
}

/**
 * Set authentication token directly
 * @param token JWT token string
 */
export function setAuthToken(token: string): void {
  try {
    // Parse token to get user data
    const payload = JSON.parse(atob(token.split('.')[1]));
    const user: User = {
      id: payload.userId || payload.id,
      name: payload.name || '',
      email: payload.email || '',
      avatar: payload.avatar || '',
      isAdmin: payload.isAdmin || false,
      token: token,
    };
    localStorage.setItem('cyberfeed_user', JSON.stringify(user));
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
}

/**
 * Remove user authentication data
 */
export function removeAuthData(): void {
  localStorage.removeItem('cyberfeed_user');
  localStorage.removeItem('guestToken');
}

/**
 * Check if user is admin
 * @param user User object
 * @returns true if user is admin, false otherwise
 */
export function isAdmin(user: User): boolean {
  return !!user.isAdmin;
}