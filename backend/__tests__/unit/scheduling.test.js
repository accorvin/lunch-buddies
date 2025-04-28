const { mockDynamoClient, clearMockItems, seedMockItems } = require('../mocks/dynamodb-mock');

// Mock the db module
jest.mock('../../db', () => {
  return {
    getLastMatchDate: jest.fn(),
    setLastMatchDate: jest.fn().mockResolvedValue(true),
    performMatching: jest.fn().mockResolvedValue([])
  };
});

// Mock the server module
jest.mock('../../server', () => {
  return {
    app: {
      listen: jest.fn(),
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }
  };
});

const db = require('../../db');
const scheduling = require('../../scheduling');

describe('Scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMockItems();
    // Reset Date mock
    jest.spyOn(global, 'Date').mockRestore();
  });

  describe('getNextMatchDate', () => {
    it('should return current date if it\'s Friday and no matches have been run this week', async () => {
      // Mock current date to be a Friday
      const mockFriday = new Date('2024-03-15T12:00:00Z'); // This is a Friday
      jest.spyOn(global, 'Date').mockImplementation(() => mockFriday);
      
      // Mock no previous matches
      db.getLastMatchDate.mockResolvedValue(null);
      
      const nextDate = await scheduling.getNextMatchDate();
      expect(nextDate).toEqual(mockFriday);
    });

    it('should return next Friday in 3 weeks if matches were run this week', async () => {
      // Mock current date to be a Friday
      const mockFriday = new Date('2024-03-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockFriday);
      
      // Mock last match was run this week
      const lastMatchDate = new Date('2024-03-14T12:00:00Z');
      db.getLastMatchDate.mockResolvedValue(lastMatchDate);
      
      const nextDate = await scheduling.getNextMatchDate();
      // Should be 3 weeks from next Friday (March 15 + 7 days to next Friday + 21 days = April 5)
      expect(nextDate).toEqual(new Date('2024-04-05T12:00:00Z'));
    });

    it('should return next Friday in 3 weeks if it\'s not Friday', async () => {
      // Mock current date to be a Monday
      const mockMonday = new Date('2024-03-11T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockMonday);
      
      // Mock last match was run a while ago
      const lastMatchDate = new Date('2024-02-15T12:00:00Z');
      db.getLastMatchDate.mockResolvedValue(lastMatchDate);
      
      const nextDate = await scheduling.getNextMatchDate();
      // Should be 3 weeks from next Friday (March 11 + 4 days to next Friday + 21 days = April 5)
      expect(nextDate).toEqual(new Date('2024-04-05T12:00:00Z'));
    });
  });

  describe('checkAndRunMatches', () => {
    it('should run matches if no previous matches exist', async () => {
      // Mock current date
      const now = new Date('2024-03-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now);
      
      // Mock no previous matches
      db.getLastMatchDate.mockResolvedValue(null);
      
      await scheduling.checkAndRunMatches();
      
      expect(db.performMatching).toHaveBeenCalled();
      expect(db.setLastMatchDate).toHaveBeenCalledWith(now);
    });

    it('should run matches if scheduled time has arrived', async () => {
      // Mock current date
      const now = new Date('2024-04-05T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now);
      
      // Mock last match was 3 weeks ago
      const lastMatchDate = new Date('2024-03-15T12:00:00Z');
      db.getLastMatchDate.mockResolvedValue(lastMatchDate);
      
      await scheduling.checkAndRunMatches();
      
      expect(db.performMatching).toHaveBeenCalled();
      expect(db.setLastMatchDate).toHaveBeenCalledWith(now);
    });

    it('should not run matches if not scheduled time yet', async () => {
      // Mock current date to be a Wednesday
      const mockWednesday = new Date('2024-03-20T12:00:00Z');
      const mockWednesdayObj = {
        getTime: () => mockWednesday.getTime(),
        getFullYear: () => mockWednesday.getFullYear(),
        getMonth: () => mockWednesday.getMonth(),
        getDate: () => mockWednesday.getDate(),
        getDay: () => 3, // Wednesday
        toISOString: () => mockWednesday.toISOString()
      };
      jest.spyOn(global, 'Date').mockImplementation(() => mockWednesdayObj);
      
      // Mock last match was recent (last Friday)
      const lastMatchDate = new Date('2024-03-15T12:00:00Z');
      db.getLastMatchDate.mockResolvedValue(lastMatchDate);
      
      await scheduling.checkAndRunMatches();
      
      expect(db.performMatching).not.toHaveBeenCalled();
      expect(db.setLastMatchDate).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock current date
      const now = new Date('2024-03-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now);
      
      // Mock database error
      db.getLastMatchDate.mockRejectedValue(new Error('Database error'));
      
      // Should not throw
      await expect(scheduling.checkAndRunMatches()).resolves.not.toThrow();
      
      expect(db.performMatching).not.toHaveBeenCalled();
      expect(db.setLastMatchDate).not.toHaveBeenCalled();
    });
  });
}); 