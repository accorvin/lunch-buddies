/**
 * Auth middleware mocks
 */

// Mock authenticated user
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

// Mock middleware that passes through for authenticated requests
const mockAuthenticatedMiddleware = jest.fn().mockImplementation((req, res, next) => {
  req.user = { ...mockUser };
  next();
});

// Mock middleware that rejects auth
const mockUnauthenticatedMiddleware = jest.fn().mockImplementation((req, res, next) => {
  return res.status(401).json({ error: 'Authentication required' });
});

// Mock middleware that only allows admins
const mockAdminMiddleware = jest.fn().mockImplementation((req, res, next) => {
  req.user = { ...mockUser, isAdmin: true };
  next();
});

// Mock JWT verification
const mockJwtVerify = jest.fn().mockImplementation((token, secret, callback) => {
  if (token === 'valid-token') {
    callback(null, { ...mockUser });
  } else {
    callback(new Error('Invalid token'));
  }
});

module.exports = {
  mockUser,
  mockAuthenticatedMiddleware,
  mockUnauthenticatedMiddleware,
  mockAdminMiddleware,
  mockJwtVerify
}; 