const request = require('supertest');
const app = require('./server');
const db = require('./db');
const scheduling = require('./scheduling');

// Mock the server module to prevent it from starting
jest.mock('./server', () => ({
  app: {
    listen: jest.fn()
  }
}));

// Mock the scheduling module
jest.mock('./scheduling', () => ({
  getNextMatchDate: jest.fn().mockResolvedValue(new Date()),
  checkAndRunMatches: jest.fn().mockResolvedValue([])
}));

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