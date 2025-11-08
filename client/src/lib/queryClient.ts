import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthenticatedUser } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth token if available
  const user = getAuthenticatedUser();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (user?.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle different query key structures
    let url: string;
    
    if (queryKey.length === 1) {
      // Simple URL like ['/api/sources']
      url = queryKey[0] as string;
    } else if (queryKey.length === 2 && typeof queryKey[1] === 'object') {
      // URL with query params like ['/api/articles', { source: 'all', limit: 10 }]
      const baseUrl = queryKey[0] as string;
      const params = queryKey[1] as Record<string, any>;
      
      // Convert params object to URLSearchParams, filtering out undefined values
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      
      url = searchParams.toString() 
        ? `${baseUrl}?${searchParams.toString()}` 
        : baseUrl;
    } else {
      // Fallback to original behavior for other cases
      url = queryKey.join("/") as string;
    }

    // Get auth token if available
    const user = getAuthenticatedUser();
    const headers: Record<string, string> = {};
    
    if (user?.token) {
      headers["Authorization"] = `Bearer ${user.token}`;
    }
    
    console.log(`Making request to ${url}`, { user, headers });

    // Make the actual API request
    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    console.log(`Response from ${url}:`, res.status, res.statusText);
    
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * User source preferences API functions
 */
export const userSourcePreferencesApi = {
  // Get user's source preferences
  getUserSourcePreferences: async () => {
    const response = await apiRequest('GET', '/api/user-source-preferences');
    return response.json();
  },
  
  // Add/update a source preference
  updateUserSourcePreference: async (sourceId: string, isActive: boolean) => {
    const response = await apiRequest('POST', '/api/user-source-preferences', { sourceId, isActive });
    return response.json();
  },
  
  // Remove a source preference
  removeUserSourcePreference: async (sourceId: string) => {
    const response = await apiRequest('DELETE', `/api/user-source-preferences?sourceId=${encodeURIComponent(sourceId)}`);
    return response;
  }
};