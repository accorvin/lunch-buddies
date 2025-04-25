import { BACKEND_URL } from '../config';

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

// Default fetch options for all API requests
const defaultOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
  mode: 'cors',
};

// Helper function to make API requests
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${BACKEND_URL}${endpoint}`;
  
  // Get auth token
  const token = getAuthToken();
  if (!token && !endpoint.startsWith('/auth/google')) {
    throw new Error('Not authenticated');
  }
  
  // Merge default options with provided options
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

// Clear auth token
export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
} 