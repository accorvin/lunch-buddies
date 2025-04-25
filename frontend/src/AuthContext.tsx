import React, { createContext, useContext, useState, useEffect } from 'react';
import { BACKEND_URL } from './config';

interface User {
  id: string;
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
        const responseText = await response.text();
        console.log('📡 AuthContext: Raw response:', responseText);

        if (response.ok) {
          try {
            const userData = JSON.parse(responseText);
            console.log('👤 AuthContext: User data received:', userData);
            if (userData.id && userData.name && userData.email) {
              setUser(userData);
            } else {
              console.error('❌ AuthContext: Invalid user data format:', userData);
              setUser(null);
            }
          } catch (parseError) {
            console.error('❌ AuthContext: Error parsing user data:', parseError);
            setUser(null);
          }
        } else {
          console.log('❌ AuthContext: No authenticated user found');
          console.log('❌ AuthContext: Error details:', responseText);
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
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      console.log('🔓 AuthContext: Initiating logout process');
      const response = await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('📡 AuthContext: Logout response status:', response.status);
      
      if (response.ok) {
        console.log('✅ AuthContext: Logout successful');
        setUser(null);
        window.location.href = '/';
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getUserEmail }}>
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