// Handle both Vite and Jest environments
const getEnvVar = (key: string, defaultValue: string): string => {
  if (import.meta?.env) {
    return import.meta.env[key] || defaultValue;
  }
  return defaultValue;
};

export const BACKEND_URL = getEnvVar('VITE_BACKEND_URL', 'http://localhost:8080');
export const GOOGLE_CLIENT_ID = getEnvVar('VITE_GOOGLE_CLIENT_ID', 'test-client-id');

// Frontend URL - used for CORS configuration
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';

// Whether we're running in production
export const isProduction = import.meta.env.PROD;

console.log('⚙️ Environment configuration:', {
  BACKEND_URL,
  FRONTEND_URL,
  isProduction
}); 