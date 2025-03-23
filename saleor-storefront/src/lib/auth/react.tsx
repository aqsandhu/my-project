import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AuthClient, getAuthClient } from './client';

// Create Auth Context
const AuthContext = createContext<AuthClient | null>(null);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
  client?: AuthClient;
}

// Auth Provider Component
export function AuthProvider({ children, client }: AuthProviderProps) {
  const authClient = client || getAuthClient();
  
  return (
    <AuthContext.Provider value={authClient}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth(): AuthClient {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to track auth state changes
export function useAuthState() {
  const auth = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(auth.isSignedIn());

  useEffect(() => {
    const unsubscribe = auth.addEventListener({
      onSignedIn: () => setIsAuthenticated(true),
      onSignedOut: () => setIsAuthenticated(false),
      onTokenRefreshed: () => setIsAuthenticated(true),
    });

    return unsubscribe;
  }, [auth]);

  return {
    isAuthenticated,
    signIn: auth.signIn.bind(auth),
    signOut: auth.signOut.bind(auth),
  };
}

// Hook to listen for auth changes
export function useAuthChange(options: {
  apiUrl: string;
  onSignedIn?: () => void;
  onSignedOut?: () => void;
}) {
  const auth = useAuth();
  
  useEffect(() => {
    return auth.addEventListener({
      onSignedIn: options.onSignedIn,
      onSignedOut: options.onSignedOut,
    });
  }, [auth, options.onSignedIn, options.onSignedOut, options.apiUrl]);
}

// Hook for server-side authentication
export async function getServerSideAuth(cookies: Record<string, string>) {
  // This is a placeholder for server-side authentication
  // In a real implementation, you'd validate tokens from cookies
  const hasToken = cookies['baxoq_access_token'] !== undefined;
  
  return {
    isAuthenticated: hasToken,
  };
} 