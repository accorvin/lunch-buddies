# Testing Guide for Lunch Buddy App

This document covers how to run tests for both the frontend and backend components of the Lunch Buddy application.

## Backend Tests

The backend tests use Jest for running unit and integration tests. These tests focus on:

- Database operations
- API endpoints
- Authentication logic
- Matching algorithm

### Running Backend Tests

```bash
# Navigate to the backend directory
cd backend

# Install dependencies if not already installed
npm install

# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (useful during development)
npm run test:watch
```

### Test Structure

The backend tests are organized as follows:

- `__tests__/unit/`: Unit tests for individual functions and modules
- `__tests__/integration/`: Tests for API endpoints and more complex interactions
- `__tests__/mocks/`: Mock implementations used in tests

## Frontend Tests

The frontend tests use Jest and React Testing Library to test React components and hooks. These tests focus on:

- Component rendering
- User interactions
- State management
- Context providers

### Running Frontend Tests

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies if not already installed
npm install

# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (useful during development)
npm run test:watch
```

### Test Structure

The frontend tests are organized as follows:

- `__tests__/components/`: Tests for React components
- `__tests__/context/`: Tests for React context providers
- `__tests__/utils/`: Tests for utility functions
- `__mocks__/`: Mock implementations for files and styles

## Continuous Integration

This project uses GitHub Actions for continuous integration. The workflow is defined in `.github/workflows/tests.yml` and runs:

- Backend tests on Node.js 16.x and 18.x
- Frontend tests on Node.js 16.x and 18.x
- Generates and uploads test coverage reports

The CI pipeline runs automatically on:
- Each push to the `main` branch
- Each pull request targeting the `main` branch

## Writing New Tests

### Backend Tests

When adding new functionality to the backend, follow these guidelines:

1. Create a new test file in the appropriate directory (`unit` or `integration`)
2. Use the existing mocks in `__tests__/mocks/` or create new ones as needed
3. Test both success and failure paths
4. Mock external dependencies like DynamoDB, authentication, etc.

Example of a backend test:

```javascript
const { mockDynamoClient, clearMockItems } = require('../mocks/dynamodb-mock');
jest.mock('../../dynamodb', () => ({ dynamoDB: mockDynamoClient }));

describe('My Function', () => {
  beforeEach(() => {
    clearMockItems();
    jest.clearAllMocks();
  });

  test('should do something', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Frontend Tests

When adding new components or functionality to the frontend, follow these guidelines:

1. Create a new test file in the appropriate directory
2. Use React Testing Library to simulate user interactions
3. Test both UI rendering and component behavior
4. Mock external dependencies and context providers as needed

Example of a frontend test:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../../src/components/MyComponent';

describe('MyComponent', () => {
  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Some text')).toBeInTheDocument();
  });

  test('handles user interaction', async () => {
    render(<MyComponent />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Button clicked')).toBeInTheDocument();
  });
});
```

## Mocking Strategies

### DynamoDB

Backend tests use a mock implementation of DynamoDB defined in `backend/__tests__/mocks/dynamodb-mock.js`. This mock stores data in memory and simulates the behavior of DynamoDB operations.

### Authentication

Authentication is mocked in `backend/__tests__/mocks/auth-mock.js` (backend) and by mocking the `auth.ts` module (frontend).

### API Requests

Frontend tests mock the `fetch` API to simulate API requests. Backend integration tests use `supertest` to make requests to the Express app without making actual HTTP calls. 