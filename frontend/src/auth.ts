import { useAuth } from './AuthContext';

export const getUserEmail = (): string => {
  const { user } = useAuth();
  return user?.email || '';
}; 