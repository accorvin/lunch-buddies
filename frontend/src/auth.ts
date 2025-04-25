import { useAuth } from './AuthContext';
import { User } from './types';
import { BACKEND_URL } from './config';

export const getUserEmail = (): string => {
  const { user } = useAuth();
  return user?.email || '';
};

export async function checkCurrentUser(): Promise<User | null> {
  console.log('🔍 Checking current user status...');
  try {
    const response = await fetch(`${BACKEND_URL}/auth/current-user`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Current user response status:', response.status);
    
    if (!response.ok) {
      console.log('❌ Failed to get current user');
      return null;
    }

    const userData = await response.json();
    console.log('👤 User data received:', userData);
    return userData;
  } catch (error) {
    console.error('❌ Error checking current user:', error);
    return null;
  }
}

export function initiateLogin() {
  console.log('🔑 Initiating login process...');
  const loginUrl = `${BACKEND_URL}/auth/google`;
  console.log('🔗 Redirecting to:', loginUrl);
  window.location.href = loginUrl;
}

export async function logout() {
  console.log('🚪 Initiating logout...');
  try {
    const response = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Logout response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Logout failed');
      throw new Error('Logout failed');
    }

    console.log('✅ Logout successful');
    window.location.href = '/';
  } catch (error) {
    console.error('❌ Error during logout:', error);
    throw error;
  }
} 