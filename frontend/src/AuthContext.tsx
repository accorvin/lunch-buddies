import React, { createContext, useContext, useState, useEffect } from 'react';
import { BACKEND_URL } from './config';

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  getUserEmail: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get token from URL or localStorage
function getAuthToken(): string | null {
  // Check URL for token (from OAuth redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    localStorage.setItem('auth_token', token);
    // Remove token from URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return token;
  }
  // Check localStorage
  return localStorage.getItem('auth_token');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        console.log('🔍 AuthContext: Starting user check');
        console.log('🌐 AuthContext: Using backend URL:', BACKEND_URL);
        
        const token = getAuthToken();
        if (!token) {
          console.log('❌ AuthContext: No token found');
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const response = await fetch(`${BACKEND_URL}/auth/current-user`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('📡 AuthContext: Response status:', response.status);
        const responseText = await response.text();
        console.log('📡 AuthContext: Raw response:', responseText);

        if (response.ok) {
          try {
            const userData = JSON.parse(responseText);
            console.log('👤 AuthContext: User data received:', userData);
            if (userData.id && userData.name && userData.email) {
              if (mounted) {
                setUser(userData);
              }
            } else {
              console.error('❌ AuthContext: Invalid user data format:', userData);
              if (mounted) {
                setUser(null);
              }
            }
          } catch (parseError) {
            console.error('❌ AuthContext: Error parsing user data:', parseError);
            if (mounted) {
              setUser(null);
            }
          }
        } else {
          console.log('❌ AuthContext: No authenticated user found');
          console.log('❌ AuthContext: Error details:', responseText);
          if (mounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Error checking user status:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    console.log('🔄 AuthContext: Running initial user check');
    checkUser();

    return () => {
      mounted = false;
    };
  }, []);

  const login = () => {
    console.log('🔐 AuthContext: Initiating login process');
    console.log('🌐 AuthContext: Redirecting to:', `${BACKEND_URL}/auth/google`);
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      console.log('🔓 AuthContext: Initiating logout process');
      localStorage.removeItem('auth_token');
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
    }
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    getUserEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div data-testid="loading">Loading...</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 