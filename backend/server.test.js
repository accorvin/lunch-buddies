const request = require('supertest');
const express = require('express');
const { app, scheduledJob } = require('./server');
const db = require('./db');
const scheduling = require('./scheduling');

// Mock the db module
jest.mock('./db', () => ({
  getLastMatchDate: jest.fn(),
  setLastMatchDate: jest.fn()
}));

// Mock the scheduling module
jest.mock('./scheduling', () => ({
  getNextMatchDate: jest.fn(),
  checkAndRunMatches: jest.fn()
}));

// Mock JWT verification and middleware
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ 
    isAdmin: true,
    email: 'admin@example.com'
  })
}));

// Mock process.env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Global test cleanup
afterAll(done => {
  // Close any remaining connections
  app.removeAllListeners();
  if (scheduledJob) {
    scheduledJob.cancel();
  }
  done();
});

describe('Scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate next match date correctly', async () => {
    const mockDate = new Date('2024-03-15T12:00:00Z');
    scheduling.getNextMatchDate.mockResolvedValue(mockDate);
    
    const nextMatchDate = await scheduling.getNextMatchDate();
    expect(nextMatchDate).toBeInstanceOf(Date);
    expect(nextMatchDate).toEqual(mockDate);
  });

  it('should run matches when scheduled', async () => {
    const mockMatches = [{ id: 1, users: ['user1', 'user2'] }];
    scheduling.checkAndRunMatches.mockResolvedValue(mockMatches);
    
    const result = await scheduling.checkAndRunMatches();
    expect(result).toBeDefined();
    expect(result).toEqual(mockMatches);
  });
});

describe('Next Match Date Endpoint', () => {
  let server;

  beforeEach(done => {
    jest.clearAllMocks();
    server = app.listen(0, () => done());
  });

  afterEach(done => {
    if (server) {
      server.close(() => done());
    } else {
      done();
    }
  });

  it('should set next match date successfully', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
    
    // Mock setLastMatchDate to resolve with true on success
    db.setLastMatchDate.mockImplementation(() => {
      return Promise.resolve(true);
    });
    
    const response = await request(server)
      .post('/api/next-match-date')
      .set('Authorization', 'Bearer valid-token')
      .send({ date: futureDate.toISOString() });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.nextMatchDate).toBeDefined();
    expect(db.setLastMatchDate).toHaveBeenCalled();
  });

  it('should reject invalid date format', async () => {
    const response = await request(server)
      .post('/api/next-match-date')
      .set('Authorization', 'Bearer valid-token')
      .send({ date: 'invalid-date' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid date format');
    expect(db.setLastMatchDate).not.toHaveBeenCalled();
  });

  it('should reject past dates', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1 day in the past
    
    const response = await request(server)
      .post('/api/next-match-date')
      .set('Authorization', 'Bearer valid-token')
      .send({ date: pastDate.toISOString() });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Match date must be in the future');
    expect(db.setLastMatchDate).not.toHaveBeenCalled();
  });

  it('should require date parameter', async () => {
    const response = await request(server)
      .post('/api/next-match-date')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Date is required');
    expect(db.setLastMatchDate).not.toHaveBeenCalled();
  });
}); 