import React, { createContext, useContext, useState, useEffect } from 'react';
import { BACKEND_URL } from './config';

interface User {
  name: string;
  email: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  getUserEmail: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('🔍 AuthContext: Starting user check');
        console.log('🌐 AuthContext: Using backend URL:', BACKEND_URL);
        
        const response = await fetch(`${BACKEND_URL}/auth/current-user`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('📡 AuthContext: Response status:', response.status);
        console.log('📡 AuthContext: Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          const userData = await response.json();
          console.log('👤 AuthContext: User data received:', userData);
          setUser(userData);
        } else {
          console.log('❌ AuthContext: No authenticated user found');
          const errorText = await response.text();
          console.log('❌ AuthContext: Error details:', errorText);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ AuthContext: Error checking user status:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    console.log('🔄 AuthContext: Running initial user check');
    checkUser();
  }, []);

  const login = () => {
    console.log('🔐 AuthContext: Initiating login process');
    console.log('🌐 AuthContext: Redirecting to:', `${BACKEND_URL}/auth/google`);
    // Add a small delay to ensure logs are visible
    setTimeout(() => {
      window.location.href = `${BACKEND_URL}/auth/google`;
    }, 100);
  };

  const logout = async () => {
    try {
      console.log('🔓 AuthContext: Initiating logout process');
      const response = await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 AuthContext: Logout response status:', response.status);
      
      if (response.ok) {
        console.log('✅ AuthContext: Logout successful');
        setUser(null);
      } else {
        console.error('❌ AuthContext: Logout failed');
        const errorText = await response.text();
        console.error('❌ AuthContext: Logout error details:', errorText);
      }
    } catch (error) {
      console.error('❌ AuthContext: Error during logout:', error);
    }
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const contextValue = {
    user,
    loading,
    login,
    logout,
    getUserEmail
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
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