// Backend API URL - defaults to localhost in development, override with VITE_API_BASE_URL env var
export const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'; 