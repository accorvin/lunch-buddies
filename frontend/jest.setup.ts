/// <reference types="jest" />
import '@testing-library/jest-dom';

// Mock ResizeObserver which isn't available in the test environment
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockFetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    statusText: 'OK',
  })
) as unknown as typeof fetch;

global.fetch = mockFetch;

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

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 