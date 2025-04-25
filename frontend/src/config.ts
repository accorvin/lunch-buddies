// Backend API URL - defaults to localhost in development, override with VITE_BACKEND_URL env var
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'; 