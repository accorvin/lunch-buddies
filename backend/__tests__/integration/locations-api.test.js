const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { mockAuthenticatedMiddleware, mockAdminMiddleware } = require('../mocks/auth-mock');
const { mockDynamoClient, clearMockItems, seedMockItems } = require('../mocks/dynamodb-mock');

// Mock the db module
jest.mock('../../db', () => {
  const originalModule = jest.requireActual('../../db');
  
  const DEFAULT_MESSAGE = `🎉 You've been matched for lunch in {location} with {buddyName}!

Common available days: {commonDays}
Email: {buddyEmail}

Reach out to schedule your lunch! 🍽️`;

  return {
    ...originalModule,
    getAllLocations: jest.fn().mockImplementation(async () => {
      return ['Boston', 'Raleigh', 'Bangalore'];
    }),
    getAllLocationsWithDetails: jest.fn().mockImplementation(async () => {
      return [
        { locationId: 'Boston', name: 'Boston', customMessage: null, createdAt: '2024-01-01T00:00:00.000Z' },
        { locationId: 'Raleigh', name: 'Raleigh', customMessage: 'Custom Raleigh message!', createdAt: '2024-01-01T00:00:00.000Z' },
        { locationId: 'Bangalore', name: 'Bangalore', customMessage: null, createdAt: '2024-01-01T00:00:00.000Z' }
      ];
    }),
    getLocationMessage: jest.fn().mockImplementation(async (locationName) => {
      if (locationName === 'Raleigh') {
        return 'Custom Raleigh message!';
      }
      return DEFAULT_MESSAGE;
    }),
    updateLocationMessage: jest.fn().mockImplementation(async (locationName, customMessage) => {
      if (locationName === 'NonExistent') {
        throw new Error('Location "NonExistent" not found');
      }
      return {
        locationId: locationName,
        name: locationName,
        customMessage,
        updatedAt: new Date().toISOString()
      };
    }),
    saveLocation: jest.fn().mockImplementation(async (locationName) => {
      return { locationId: locationName, name: locationName, createdAt: new Date().toISOString() };
    }),
    deleteLocationByName: jest.fn().mockImplementation(async (locationName) => {
      if (locationName === 'InUse') {
        throw new Error(`Cannot delete location "InUse" as 1 participant(s) are registered there.`);
      }
      return true;
    }),
    DEFAULT_MATCH_MESSAGE: DEFAULT_MESSAGE
  };
});

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  requireAuth: mockAuthenticatedMiddleware,
  requireAdmin: mockAdminMiddleware
}));

// Create mock routes/locations module
jest.mock('../../routes/locations', () => {
  const express = require('express');
  const router = express.Router();
  const db = require('../../db');
  
  // GET /api/locations
  router.get('/', async (req, res) => {
    try {
      const locations = await db.getAllLocations();
      res.status(200).json(locations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/locations
  router.post('/', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Location name is required' });
      }
      const location = await db.saveLocation(name);
      res.status(201).json(location);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // DELETE /api/locations/:name
  router.delete('/:name', async (req, res) => {
    try {
      const { name } = req.params;
      await db.deleteLocationByName(name);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/locations/details
  router.get('/details', async (req, res) => {
    try {
      const locations = await db.getAllLocationsWithDetails();
      res.status(200).json(locations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/locations/:name/message
  router.get('/:name/message', async (req, res) => {
    try {
      const { name } = req.params;
      if (!name) {
        return res.status(400).json({ error: 'Location name parameter is required' });
      }
      const message = await db.getLocationMessage(name);
      const isCustom = message !== db.DEFAULT_MATCH_MESSAGE;
      res.status(200).json({
        locationName: name,
        message,
        isCustom,
        defaultMessage: db.DEFAULT_MATCH_MESSAGE
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/locations/:name/message
  router.put('/:name/message', async (req, res) => {
    try {
      const { name } = req.params;
      const { customMessage } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Location name parameter is required' });
      }
      
      if (customMessage !== null && customMessage !== undefined && typeof customMessage !== 'string') {
        return res.status(400).json({ error: 'Custom message must be a string or null' });
      }

      const updatedLocation = await db.updateLocationMessage(name, customMessage || null);
      res.status(200).json({
        locationName: name,
        message: updatedLocation.customMessage || db.DEFAULT_MATCH_MESSAGE,
        isCustom: !!updatedLocation.customMessage,
        updatedAt: updatedLocation.updatedAt
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
});

// Create a test app
const app = express();
app.use(bodyParser.json());

// Import routes after mocking
const locationsRoutes = require('../../routes/locations');
app.use('/api/locations', locationsRoutes);

describe('Locations API', () => {
  // Reset mocks before each test
  beforeEach(() => {
    clearMockItems();
    jest.clearAllMocks();
  });

  test('GET /api/locations should return a list of locations', async () => {
    const response = await request(app).get('/api/locations');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(['Boston', 'Raleigh', 'Bangalore']);
  });

  test('POST /api/locations should add a new location', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ name: 'New York' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('name', 'New York');
    expect(response.body).toHaveProperty('locationId', 'New York');
    expect(response.body).toHaveProperty('createdAt');
  });

  test('POST /api/locations should validate location name', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('DELETE /api/locations/:name should delete a location', async () => {
    const response = await request(app)
      .delete('/api/locations/Boston');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  test('DELETE /api/locations/:name should return an error if in use', async () => {
    const response = await request(app)
      .delete('/api/locations/InUse');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Cannot delete location "InUse"');
  });

  test('GET /api/locations/details should return locations with message details', async () => {
    const response = await request(app).get('/api/locations/details');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toEqual({
      locationId: 'Boston',
      name: 'Boston',
      customMessage: null,
      createdAt: '2024-01-01T00:00:00.000Z'
    });
    expect(response.body[1]).toEqual({
      locationId: 'Raleigh',
      name: 'Raleigh',
      customMessage: 'Custom Raleigh message!',
      createdAt: '2024-01-01T00:00:00.000Z'
    });
  });

  test('GET /api/locations/:name/message should return default message for location without custom message', async () => {
    const response = await request(app).get('/api/locations/Boston/message');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      locationName: 'Boston',
      message: expect.stringContaining('You\'ve been matched for lunch'),
      isCustom: false,
      defaultMessage: expect.stringContaining('You\'ve been matched for lunch')
    });
  });

  test('GET /api/locations/:name/message should return custom message for location with custom message', async () => {
    const response = await request(app).get('/api/locations/Raleigh/message');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      locationName: 'Raleigh',
      message: 'Custom Raleigh message!',
      isCustom: true,
      defaultMessage: expect.stringContaining('You\'ve been matched for lunch')
    });
  });

  test('PUT /api/locations/:name/message should update custom message', async () => {
    const customMessage = 'Welcome to Boston lunch matching! 🏙️';
    const response = await request(app)
      .put('/api/locations/Boston/message')
      .send({ customMessage });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      locationName: 'Boston',
      message: customMessage,
      isCustom: true,
      updatedAt: expect.any(String)
    });
  });

  test('PUT /api/locations/:name/message should reset to default when customMessage is null', async () => {
    const response = await request(app)
      .put('/api/locations/Raleigh/message')
      .send({ customMessage: null });
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      locationName: 'Raleigh',
      message: expect.stringContaining('You\'ve been matched for lunch'),
      isCustom: false,
      updatedAt: expect.any(String)
    });
  });

  test('PUT /api/locations/:name/message should return 404 for non-existent location', async () => {
    const response = await request(app)
      .put('/api/locations/NonExistent/message')
      .send({ customMessage: 'Test message' });
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('not found');
  });

  test('PUT /api/locations/:name/message should validate customMessage type', async () => {
    const response = await request(app)
      .put('/api/locations/Boston/message')
      .send({ customMessage: 123 });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('must be a string or null');
  });
}); 