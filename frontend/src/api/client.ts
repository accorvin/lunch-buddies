import { BACKEND_URL } from '../config';

// Default fetch options for all API requests
const defaultOptions: RequestInit = {
  credentials: 'include', // Always send cookies
  headers: {
    'Content-Type': 'application/json',
  },
  mode: 'cors', // Explicitly set CORS mode
};

// Helper function to make API requests
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${BACKEND_URL}${endpoint}`;
  
  // Merge default options with provided options
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    // Log request details in development
    if (import.meta.env.DEV) {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      console.log('Options:', fetchOptions);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    // For 204 No Content responses, return null
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
} 