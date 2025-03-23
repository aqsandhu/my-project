// Server-side authentication utilities
import { cookies } from 'next/headers';
import { invariant } from 'ts-invariant';
import Cookies from 'js-cookie';

// Cookie names
const ACCESS_TOKEN_COOKIE = 'saleor_access_token';

// Get token from server-side cookies
export function getServerToken(): string | undefined {
  return cookies().get(ACCESS_TOKEN_COOKIE)?.value;
}

// Get auth headers for server-side requests
export function getServerAuthHeaders(): Record<string, string> {
  const token = getServerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Get token from client-side cookies
export function getClientToken(): string | undefined {
  return Cookies.get(ACCESS_TOKEN_COOKIE);
}

// Get auth headers for client-side requests
export function getAuthHeaders(): Record<string, string> {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Check if user is authenticated on server side
export function isAuthenticatedServer(): boolean {
  return !!getServerToken();
}

// Creating a fetch function that includes auth headers
export function createAuthFetch(apiUrl: string) {
  invariant(apiUrl, "Missing API URL for server authentication");
  
  return async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const authHeaders = getServerAuthHeaders();
    const authInit = { 
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        ...authHeaders,
      }
    };
    
    return fetch(input, authInit);
  };
}

// Create a server-side authenticated client
export function createServerAuthClient(apiUrl: string) {
  invariant(apiUrl, "Missing API URL for server authentication client");
  
  const fetchWithAuth = createAuthFetch(apiUrl);
  
  return {
    fetchWithAuth,
    isAuthenticated: isAuthenticatedServer(),
  };
}

// Get a server auth client with the API URL from environment
export function getServerAuthClient() {
  const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
  invariant(apiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");
  
  return createServerAuthClient(apiUrl);
} 