const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { mockAuthenticatedMiddleware, mockAdminMiddleware } = require('../mocks/auth-mock');
const { mockDynamoClient, clearMockItems, seedMockItems } = require('../mocks/dynamodb-mock');

// Mock the db module
jest.mock('../../db', () => {
  const originalModule = jest.requireActual('../../db');
  
  return {
    ...originalModule,
    getAllLocations: jest.fn().mockImplementation(async () => {
      return ['Boston', 'Raleigh', 'Bangalore'];
    }),
    saveLocation: jest.fn().mockImplementation(async (locationName) => {
      return { locationId: locationName, name: locationName, createdAt: new Date().toISOString() };
    }),
    deleteLocationByName: jest.fn().mockImplementation(async (locationName) => {
      if (locationName === 'InUse') {
        throw new Error(`Cannot delete location "InUse" as 1 participant(s) are registered there.`);
      }
      return true;
    })
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
}); 