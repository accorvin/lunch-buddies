/**
 * Unit tests for the matching algorithm
 */

const { mockDynamoClient, clearMockItems, seedMockItems } = require('../mocks/dynamodb-mock');

// Mock the db module
jest.mock('../../db', () => {
  return {
    getAllRegistrations: jest.fn(),
    saveMatchHistory: jest.fn().mockResolvedValue({ matchId: 'test-match-id' })
  };
});

// Import functions to test
// Note: This assumes the matching logic is in a separate function in server.js
// Ideally, the matching logic would be extracted to its own module
const db = require('../../db');

describe('Matching Algorithm', () => {
  // Registrations test data
  const testRegistrations = [
    {
      userId: 'user1',
      name: 'User 1',
      email: 'user1@example.com',
      availableDays: ['Monday', 'Wednesday'],
      location: 'Boston'
    },
    {
      userId: 'user2',
      name: 'User 2',
      email: 'user2@example.com',
      availableDays: ['Monday', 'Tuesday'],
      location: 'Boston'
    },
    {
      userId: 'user3',
      name: 'User 3',
      email: 'user3@example.com',
      availableDays: ['Wednesday', 'Friday'],
      location: 'Boston'
    },
    {
      userId: 'user4',
      name: 'User 4',
      email: 'user4@example.com',
      availableDays: ['Tuesday', 'Thursday'],
      location: 'Raleigh'
    },
    {
      userId: 'user5',
      name: 'User 5',
      email: 'user5@example.com',
      availableDays: ['Monday', 'Thursday'],
      location: 'Raleigh'
    }
  ];

  beforeEach(() => {
    clearMockItems();
    jest.clearAllMocks();
  });

  // Helper function that implements the core matching logic
  // This simplifies testing the matching algorithm
  function generateMatches(registrations) {
    // Group registrations by location
    const registrationsByLocation = {};
    
    registrations.forEach(registration => {
      const location = registration.location;
      if (!registrationsByLocation[location]) {
        registrationsByLocation[location] = [];
      }
      registrationsByLocation[location].push(registration);
    });

    // Generate matches for each location
    const allMatches = [];
    
    Object.keys(registrationsByLocation).forEach(location => {
      const locationRegistrations = registrationsByLocation[location];
      
      // Skip if not enough users to match
      if (locationRegistrations.length < 2) return;
      
      // Find potential matches
      const matches = [];
      
      // Skip users who have been matched already
      const matchedUsers = new Set();
      
      for (let i = 0; i < locationRegistrations.length; i++) {
        const user1 = locationRegistrations[i];
        
        if (matchedUsers.has(user1.userId)) continue;
        
        let bestMatch = null;
        let bestMatchScore = -1;
        
        for (let j = i + 1; j < locationRegistrations.length; j++) {
          const user2 = locationRegistrations[j];
          
          if (matchedUsers.has(user2.userId)) continue;
          
          // Find common days
          const commonDays = user1.availableDays.filter(day => 
            user2.availableDays.includes(day)
          );
          
          // Score is the number of common days
          const score = commonDays.length;
          
          // Only consider matches with at least one common day
          if (score > 0 && score > bestMatchScore) {
            bestMatch = {
              users: [user1.userId, user2.userId],
              commonDays,
              location
            };
            bestMatchScore = score;
          }
        }
        
        if (bestMatch) {
          matches.push(bestMatch);
          bestMatch.users.forEach(userId => matchedUsers.add(userId));
        }
      }
      
      allMatches.push(...matches);
    });
    
    return allMatches;
  }

  test('should match users with common available days within the same location', () => {
    // Arrange
    db.getAllRegistrations.mockResolvedValue(testRegistrations);
    
    // Act
    const matches = generateMatches(testRegistrations);
    
    // Assert
    expect(matches.length).toBeGreaterThan(0);
    
    // Check if each match has users from the same location
    matches.forEach(match => {
      expect(match).toHaveProperty('location');
      expect(match).toHaveProperty('users');
      expect(match).toHaveProperty('commonDays');
      expect(match.users.length).toBe(2);
      expect(match.commonDays.length).toBeGreaterThan(0);
    });
  });

  test('should not match users from different locations', () => {
    // Arrange
    db.getAllRegistrations.mockResolvedValue(testRegistrations);
    
    // Act
    const matches = generateMatches(testRegistrations);
    
    // Assert
    matches.forEach(match => {
      // Extract location for both users in the match
      const user1 = testRegistrations.find(reg => reg.userId === match.users[0]);
      const user2 = testRegistrations.find(reg => reg.userId === match.users[1]);
      
      expect(user1.location).toBe(user2.location);
      expect(match.location).toBe(user1.location);
    });
  });

  test('should not match users without common available days', () => {
    // Arrange
    const noCommonDaysRegistrations = [
      {
        userId: 'user1',
        name: 'User 1',
        availableDays: ['Monday', 'Wednesday'],
        location: 'Boston'
      },
      {
        userId: 'user2',
        name: 'User 2',
        availableDays: ['Tuesday', 'Thursday'],
        location: 'Boston'
      }
    ];
    
    // Act
    const matches = generateMatches(noCommonDaysRegistrations);
    
    // Assert
    expect(matches.length).toBe(0);
  });

  test('should maximize the number of matches', () => {
    // Arrange
    const registrations = [
      { userId: 'A', availableDays: ['Monday', 'Wednesday'], location: 'X' },
      { userId: 'B', availableDays: ['Monday'], location: 'X' },
      { userId: 'C', availableDays: ['Monday', 'Friday'], location: 'X' },
      { userId: 'D', availableDays: ['Wednesday', 'Friday'], location: 'X' }
    ];
    
    // Act
    const matches = generateMatches(registrations);
    
    // Assert
    expect(matches.length).toBe(2); // Should be able to match all 4 users
    
    // Check that each user is matched exactly once
    const matchedUsers = new Set();
    matches.forEach(match => {
      match.users.forEach(userId => {
        expect(matchedUsers.has(userId)).toBe(false);
        matchedUsers.add(userId);
      });
    });
    
    expect(matchedUsers.size).toBe(4);
  });
}); 