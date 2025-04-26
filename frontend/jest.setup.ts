/// <reference types="jest" />
import '@testing-library/jest-dom';

interface MockLocalStorage {
  store: { [key: string]: string };
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
}

// Mock ResizeObserver which isn't available in the test environment
const mockResizeObserver = {
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
};

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: jest.fn(() => mockResizeObserver)
});

// Mock localStorage with a store to actually hold values
const mockLocalStorage: MockLocalStorage = {
  store: {},
  getItem: jest.fn((key: string): string | null => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string): void => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: jest.fn((key: string): void => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn((): void => {
    mockLocalStorage.store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true
});

// Mock fetch with proper response handling
const mockFetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    statusText: 'OK',
  })
);

(global as any).fetch = mockFetch;

// Override console.error to catch testing warnings
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out act warnings that come from React Testing Library
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: An update to') &&
    args[0].includes('inside a test was not wrapped in act')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Clear all mocks and localStorage before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockLocalStorage.clear();
  mockLocalStorage.store = {};
}); 