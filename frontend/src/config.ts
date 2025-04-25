// Backend API URL - defaults to localhost in development
// Can be overridden with VITE_BACKEND_URL environment variable
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// Frontend URL - used for CORS configuration
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';

// Whether we're running in production
export const isProduction = import.meta.env.PROD;

console.log('⚙️ Environment configuration:', {
  BACKEND_URL,
  FRONTEND_URL,
  isProduction
}); 