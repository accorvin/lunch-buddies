// Mock the authentication middleware
const mockAuthMiddleware = jest.fn((req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
});
jest.mock('../../middleware/auth', () => mockAuthMiddleware);

// Mock the database functions
const mockGetRegistrationByUserId = jest.fn();
const mockDeleteRegistration = jest.fn();
const mockGetAllLocations = jest.fn();
jest.mock('../../db', () => ({
  getRegistrationByUserId: mockGetRegistrationByUserId,
  deleteRegistration: mockDeleteRegistration,
  getAllLocations: mockGetAllLocations
}));

// Import the mocked Slack module
jest.mock('../../slack');
const { getSlackUserIdByEmail, sendSlackDM } = require('../../slack');

const express = require('express');
const request = require('supertest');
const app = express();

// Set up the routes
app.use(express.json());

// Import the route handler
app.delete("/api/admin/registration/:userId", mockAuthMiddleware, async (req, res) => {
  // Check if user is admin
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // First get the registration to notify the admin
    const registration = await mockGetRegistrationByUserId(userId);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Delete the registration
    await mockDeleteRegistration(userId);

    // Send Slack notification
    const adminSlackId = await getSlackUserIdByEmail(process.env.SLACK_ADMIN_EMAIL);
    if (adminSlackId) {
      await sendSlackDM(adminSlackId, `❌ Admin cancelled registration for ${registration.name} (${registration.email}) in ${registration.location}`);
    }

    res.status(200).json({ message: "Registration cancelled successfully" });
  } catch (err) {
    console.error("❌ Failed to cancel registration:", err);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

describe('Admin Registration Cancellation Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLocations.mockResolvedValue(['Boston', 'Raleigh']);
  });

  test('should cancel registration when admin is authenticated', async () => {
    // Mock admin user
    mockAuthMiddleware.mockImplementationOnce((req, res, next) => {
      req.user = { id: 'admin123', isAdmin: true };
      next();
    });

    // Mock registration data
    const mockRegistration = {
      userId: 'test_user',
      name: 'Test User',
      email: 'test@example.com',
      location: 'Boston',
      availableDays: ['Monday']
    };

    // Mock database functions
    mockGetRegistrationByUserId.mockResolvedValue(mockRegistration);
    mockDeleteRegistration.mockResolvedValue();

    const response = await request(app)
      .delete('/api/admin/registration/test_user')
      .set('Authorization', 'Bearer mock-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Registration cancelled successfully" });
    expect(mockGetRegistrationByUserId).toHaveBeenCalledWith('test_user');
    expect(mockDeleteRegistration).toHaveBeenCalledWith('test_user');
  });

  test('should return 403 when non-admin tries to cancel registration', async () => {
    // Mock non-admin user
    mockAuthMiddleware.mockImplementationOnce((req, res, next) => {
      req.user = { id: 'user123', isAdmin: false };
      next();
    });

    const response = await request(app)
      .delete('/api/admin/registration/test_user')
      .set('Authorization', 'Bearer mock-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Unauthorized: Admin access required" });
  });

  test('should return 404 when registration not found', async () => {
    // Mock admin user
    mockAuthMiddleware.mockImplementationOnce((req, res, next) => {
      req.user = { id: 'admin123', isAdmin: true };
      next();
    });

    // Mock database function to return null
    mockGetRegistrationByUserId.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/admin/registration/non_existent_user')
      .set('Authorization', 'Bearer mock-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Registration not found" });
  });
}); 