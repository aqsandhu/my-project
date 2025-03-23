// Custom authentication client that doesn't rely on external SDKs
import Cookies from 'js-cookie';
import { invariant } from 'ts-invariant';

// Cookie names for storing tokens
const ACCESS_TOKEN_COOKIE = 'saleor_access_token';
const REFRESH_TOKEN_COOKIE = 'saleor_refresh_token';
const CSRF_TOKEN_COOKIE = 'saleor_csrf_token';

// Default cookie options with enhanced security
const DEFAULT_COOKIE_OPTIONS = {
  expires: 1, // Reduce from 365 days to 1 day for better security
  secure: true, // Always use secure cookies
  sameSite: 'strict' as const, // Use strict SameSite policy for better security
  path: '/',
};

// Simple encryption/decryption for additional token security
class TokenEncryption {
  private static readonly encryptionKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || crypto.getRandomValues(new Uint8Array(32)).join('');

  static encrypt(text: string): string {
    if (!text) return text;
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  }

  static decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;
    try {
      const text = atob(encryptedText);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (error) {
      console.error('Token decryption failed:', error);
      return '';
    }
  }
}

interface AuthEvent {
  type: 'signIn' | 'signOut' | 'tokenRefreshed' | 'securityViolation';
  token?: string;
  details?: string;
}

interface AuthEventCallbacks {
  onSignedIn?: () => void;
  onSignedOut?: () => void;
  onTokenRefreshed?: () => void;
  onSecurityViolation?: (details: string) => void;
}

interface AuthClientOptions {
  apiUrl: string;
  enableLogging?: boolean;
}

interface TokenResponse {
  token: string;
  refreshToken: string;
  csrfToken?: string;
}

interface UserSession {
  lastActive: number;
  loginAttempts: number;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthClient {
  private apiUrl: string;
  private eventListeners: AuthEventCallbacks[] = [];
  private session: UserSession = {
    lastActive: Date.now(),
    loginAttempts: 0,
  };
  private readonly enableLogging: boolean;
  private readonly sessionTimeout: number;
  private readonly maxLoginAttempts: number;
  private sessionCheckInterval: number | null = null;

  constructor(options: AuthClientOptions) {
    this.apiUrl = options.apiUrl;
    this.enableLogging = options.enableLogging || false;
    this.sessionTimeout = this.getConfigValue('NEXT_PUBLIC_SESSION_TIMEOUT', 3600000);
    this.maxLoginAttempts = this.getConfigValue('NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS', 5);

    if (typeof window !== 'undefined') {
      this.setupSessionChecking();
      this.captureClientInfo();
    }
  }

  private getConfigValue(key: string, defaultValue: number): number {
    if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env) {
      const value = process.env[key];
      if (value && !isNaN(Number(value))) {
        return Number(value);
      }
    }
    return defaultValue;
  }

  private captureClientInfo(): void {
    if (typeof window !== 'undefined') {
      this.session.userAgent = window.navigator.userAgent;
    }
  }

  private setupSessionChecking(): void {
    this.sessionCheckInterval = window.setInterval(() => {
      const currentTime = Date.now();
      if (currentTime - this.session.lastActive > this.sessionTimeout) {
        this.logSecurityEvent('Session timeout - auto sign out');
        this.signOut();
      } else {
        this.session.lastActive = currentTime;
      }
    }, 60000) as unknown as number;
  }

  destroy(): void {
    if (this.sessionCheckInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.sessionCheckInterval);
    }
  }

  private logSecurityEvent(message: string): void {
    if (this.enableLogging) {
      // Remove any sensitive data before logging
      const sanitizedMessage = message.replace(/email=.*?(&|$)/, 'email=REDACTED&')
        .replace(/password=.*?(&|$)/, 'password=REDACTED&')
        .replace(/token=.*?(&|$)/, 'token=REDACTED&');
        
      console.warn(`[Security Event] ${sanitizedMessage}`);
      
      this.dispatchEvent({ 
        type: 'securityViolation',
        details: sanitizedMessage
      });
      
      this.sendSecurityLog(sanitizedMessage).catch(err => {
        console.error('Failed to send security log:', err);
      });
    }
  }

  private async sendSecurityLog(message: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl.replace('/graphql', '')}/security-log/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: message,
          timestamp: new Date().toISOString(),
          userAgent: this.session.userAgent,
        }),
      });
    } catch (error) {
      console.error('Security logging error:', error);
    }
  }

  addEventListener(callbacks: AuthEventCallbacks) {
    this.eventListeners.push(callbacks);
    return () => {
      this.eventListeners = this.eventListeners.filter(listener => listener !== callbacks);
    };
  }

  private dispatchEvent(event: AuthEvent) {
    this.eventListeners.forEach(listener => {
      if (event.type === 'signIn' && listener.onSignedIn) {
        listener.onSignedIn();
      } else if (event.type === 'signOut' && listener.onSignedOut) {
        listener.onSignedOut();
      } else if (event.type === 'tokenRefreshed' && listener.onTokenRefreshed) {
        listener.onTokenRefreshed();
      } else if (event.type === 'securityViolation' && listener.onSecurityViolation && event.details) {
        listener.onSecurityViolation(event.details);
      }
    });
  }

  getAccessToken(): string | undefined {
    const encryptedToken = Cookies.get(ACCESS_TOKEN_COOKIE);
    return encryptedToken ? TokenEncryption.decrypt(encryptedToken) : undefined;
  }

  getRefreshToken(): string | undefined {
    const encryptedToken = Cookies.get(REFRESH_TOKEN_COOKIE);
    return encryptedToken ? TokenEncryption.decrypt(encryptedToken) : undefined;
  }

  isSignedIn(): boolean {
    return !!this.getAccessToken();
  }

  async signIn(email: string, password: string): Promise<boolean> {
    try {
      if (this.session.loginAttempts >= this.maxLoginAttempts) {
        this.logSecurityEvent(`Too many login attempts for email: ${email}`);
        return false;
      }
      
      this.session.loginAttempts++;
      
      const response = await fetch(`${this.apiUrl.replace('/graphql', '')}/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logSecurityEvent(`Failed login attempt for email: ${email}`);
        }
        return false;
      }

      const data = await response.json() as TokenResponse;
      this.setTokens(data);
      
      this.session.loginAttempts = 0;
      this.session.lastActive = Date.now();
      
      this.dispatchEvent({ type: 'signIn', token: data.token });
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      this.logSecurityEvent(`Error during login: ${error}`);
      return false;
    }
  }

  signOut(): void {
    Cookies.remove(ACCESS_TOKEN_COOKIE);
    Cookies.remove(REFRESH_TOKEN_COOKIE);
    Cookies.remove(CSRF_TOKEN_COOKIE);
    this.dispatchEvent({ type: 'signOut' });
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl.replace('/graphql', '')}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        this.logSecurityEvent('Token refresh failed');
        this.signOut();
        return false;
      }

      const data = await response.json() as TokenResponse;
      this.setTokens(data);
      this.session.lastActive = Date.now();
      this.dispatchEvent({ type: 'tokenRefreshed', token: data.token });
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logSecurityEvent(`Token refresh error: ${error}`);
      this.signOut();
      return false;
    }
  }

  private setTokens(data: TokenResponse): void {
    const encryptedAccessToken = TokenEncryption.encrypt(data.token);
    const encryptedRefreshToken = TokenEncryption.encrypt(data.refreshToken);
    
    Cookies.set(ACCESS_TOKEN_COOKIE, encryptedAccessToken, DEFAULT_COOKIE_OPTIONS);
    Cookies.set(REFRESH_TOKEN_COOKIE, encryptedRefreshToken, DEFAULT_COOKIE_OPTIONS);
    
    if (data.csrfToken) {
      const encryptedCsrfToken = TokenEncryption.encrypt(data.csrfToken);
      Cookies.set(CSRF_TOKEN_COOKIE, encryptedCsrfToken, DEFAULT_COOKIE_OPTIONS);
    }
  }

  async fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const accessToken = this.getAccessToken();
    this.session.lastActive = Date.now();
    
    if (!accessToken) {
      return fetch(input, init);
    }

    const authInit = { ...(init || {}) };
    authInit.headers = {
      ...(authInit.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    };

    let response = await fetch(input, authInit);

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = this.getAccessToken();
        authInit.headers = {
          ...(authInit.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(input, authInit);
      }
    }

    return response;
  }
}

// Factory function to create the auth client
export function createAuthClient(options: AuthClientOptions): AuthClient {
  invariant(options.apiUrl, "Missing API URL for authentication client");
  return new AuthClient(options);
}

// Export singleton instance
let authClientInstance: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (typeof window === 'undefined') {
    throw new Error("Auth client should not be used on the server side");
  }
  
  if (!authClientInstance) {
    const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
    invariant(apiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");
    
    const enableLogging = process.env.NEXT_PUBLIC_ENABLE_ERROR_LOGGING === 'true';
    
    authClientInstance = createAuthClient({ 
      apiUrl,
      enableLogging
    });
  }
  
  return authClientInstance;
}

// Export utility functions
export function getTokenFromCookies(): string | undefined {
  const encryptedToken = Cookies.get(ACCESS_TOKEN_COOKIE);
  return encryptedToken ? TokenEncryption.decrypt(encryptedToken) : undefined;
}

export function isAuthenticated(): boolean {
  return !!getTokenFromCookies();
}

// Get auth headers for client-side requests
export function getAuthHeaders(): Record<string, string> {
  const token = getTokenFromCookies();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function createAuthFetch(apiUrl: string) {
  invariant(apiUrl, "Missing API URL for client authentication");
  
  return async function authFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const authHeaders = getAuthHeaders();
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

export function createClientAuthClient(apiUrl: string) {
  invariant(apiUrl, "Missing API URL for client authentication client");
  
  const fetchWithAuth = createAuthFetch(apiUrl);
  
  return {
    fetchWithAuth,
    isAuthenticated: isAuthenticated(),
  };
}

export function getClientAuthClient() {
  const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
  invariant(apiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");
  
  return createClientAuthClient(apiUrl);
}