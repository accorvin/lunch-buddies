// Mock user for testing
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  isAdmin: false
};

// Mock admin for testing
const TEST_ADMIN = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  name: 'Admin User',
  isAdmin: true
};

/**
 * Mock middleware that always authenticates as the test user
 */
function requireAuth(req, res, next) {
  req.user = TEST_USER;
  next();
}

/**
 * Mock middleware that always authenticates as an admin
 */
function requireAdmin(req, res, next) {
  req.user = TEST_ADMIN;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  TEST_USER,
  TEST_ADMIN
}; 