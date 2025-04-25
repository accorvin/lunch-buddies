/// <reference types="jest" />
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../src/AuthContext';
import '@testing-library/jest-dom';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the config module
jest.mock('../../src/config', () => ({
  BACKEND_URL: 'http://localhost:8080',
  GOOGLE_CLIENT_ID: 'test-client-id'
}));

// Mock the auth.ts module
jest.mock('../../src/auth', () => ({
  loginWithGoogle: jest.fn().mockImplementation(() => {
    // Simulate opening a popup window
    return Promise.resolve();
  }),
  logout: jest.fn().mockImplementation(() => {
    // Simulate logging out
    localStorage.removeItem('auth_token');
    return Promise.resolve();
  }),
  verifyToken: jest.fn().mockImplementation((token) => {
    if (token === 'valid-token') {
      return Promise.resolve({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg'
      });
    }
    return Promise.reject(new Error('Invalid token'));
  })
}));

// Component that uses the AuthContext
const TestAuthConsumer: React.FC = () => {
  const { user, loading, login, logout } = useAuth();

  return (
    <div>
      {loading ? <div data-testid="loading">Loading...</div> : null}
      {!loading && user ? (
        <div data-testid="user-info">
          <div data-testid="user-name">{user.name}</div>
          <div data-testid="user-email">{user.email}</div>
          <button onClick={logout} data-testid="logout-button">Logout</button>
        </div>
      ) : !loading ? (
        <button onClick={login} data-testid="login-button">Login</button>
      ) : null}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  test('renders loading state initially and then login button when no token', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );
    });

    // Wait for loading to complete since there's no token
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Login button should be visible after loading
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  test('authenticates user with valid token', async () => {
    // Set a valid token in localStorage
    localStorage.setItem('auth_token', 'valid-token');

    // Create a promise that we can resolve later
    let resolveResponse: (value: any) => void;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    // Mock the fetch response but don't resolve it immediately
    mockFetch.mockImplementationOnce(() => responsePromise);

    // Render the component
    await act(async () => {
      render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );
    });

    // Now resolve the fetch response
    await act(async () => {
      resolveResponse!({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/avatar.jpg'
        }))
      });

      // Wait for state updates to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Wait for loading to complete and user info to be visible
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  }, 15000);

  test('logs out the user when logout is clicked', async () => {
    // Set a valid token in localStorage
    localStorage.setItem('auth_token', 'valid-token');

    // Create a promise that we can resolve later
    let resolveResponse: (value: any) => void;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    // Mock the fetch response but don't resolve it immediately
    mockFetch.mockImplementationOnce(() => responsePromise);

    // Render the component
    await act(async () => {
      render(
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      );
    });

    // Now resolve the fetch response
    await act(async () => {
      resolveResponse!({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/avatar.jpg'
        }))
      });

      // Wait for state updates to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Wait for loading to complete and user info to be visible
    await waitFor(() => {
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Click logout button
    const logoutButton = screen.getByTestId('logout-button');
    await act(async () => {
      await userEvent.click(logoutButton);
      // Wait for state updates to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should show login button after logout
    await waitFor(() => {
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);
}); 