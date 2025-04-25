/// <reference types="jest" />
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../src/AuthContext';
import '@testing-library/jest-dom';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
interface MockLocalStorage {
  store: { [key: string]: string };
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
}

const mockLocalStorage: MockLocalStorage = {
  store: {},
  getItem: jest.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/test',
  search: '',
  hash: '',
  replace: jest.fn()
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock window.history
const mockHistory = {
  replaceState: jest.fn()
};

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true
});

// Mock the config module
jest.mock('../../src/config', () => ({
  BACKEND_URL: 'http://localhost:8080',
  GOOGLE_CLIENT_ID: 'test-client-id'
}));

// Mock the getAuthToken function in AuthContext
jest.mock('../../src/AuthContext', () => {
  const originalModule = jest.requireActual('../../src/AuthContext');
  return {
    ...originalModule,
    getAuthToken: jest.fn().mockImplementation(() => {
      return mockLocalStorage.getItem('auth_token');
    })
  };
});

// Component that uses the AuthContext
const TestAuthConsumer: React.FC = () => {
  const { user, login, logout } = useAuth();

  return (
    <div>
      {user ? (
        <div data-testid="user-info">
          <div data-testid="user-name">{user.name}</div>
          <div data-testid="user-email">{user.email}</div>
          <button onClick={logout} data-testid="logout-button">Logout</button>
        </div>
      ) : (
        <button onClick={login} data-testid="login-button">Login</button>
      )}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockHistory.replaceState.mockReset();
    mockLocation.href = '';
    mockLocation.search = '';
  });

  test('renders login button when no token', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    // Login button should be visible
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  test('authenticates user with valid token', async () => {
    // Set a valid token in localStorage
    mockLocalStorage.setItem('auth_token', 'valid-token');

    // Mock the fetch response for /auth/current-user
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/avatar.jpg'
        }))
      })
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Wait for loading to complete and user info to be visible
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    // Verify user info is displayed correctly
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  test('logs out the user when logout is clicked', async () => {
    // Set a valid token in localStorage
    mockLocalStorage.setItem('auth_token', 'valid-token');

    // Mock the fetch response for /auth/current-user
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/avatar.jpg'
        }))
      })
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Wait for loading to complete and user info to be visible
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    // Click logout button
    const logoutButton = screen.getByTestId('logout-button');
    await userEvent.click(logoutButton);

    // Should show login button after logout
    await waitFor(() => {
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });
  });
}); 