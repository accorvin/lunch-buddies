const { 
  mockDynamoClient, 
  clearMockItems, 
  seedMockItems 
} = require('../../__mocks__/dynamodb');

// Mock the dynamodb.js module
jest.mock('../../dynamodb', () => ({
  dynamoDB: mockDynamoClient,
  registrationsTable: 'registrations',
  matchHistoryTable: 'matchhistory',
  locationsTable: 'locations'
}));

// Import the module under test
const db = require('../../db');

describe('DB Module', () => {
  // Reset mock data before each test
  beforeEach(() => {
    clearMockItems();
    jest.clearAllMocks();
  });

  describe('Location operations', () => {
    test('getAllLocations should return sorted location names', async () => {
      // Seed some test location data
      seedMockItems('locations', [
        { name: 'Boston' },
        { name: 'Raleigh' },
        { name: 'Bangalore' }
      ]);

      const locations = await db.getAllLocations();
      
      expect(locations).toEqual(['Bangalore', 'Boston', 'Raleigh']);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    test('saveLocation should store a new location', async () => {
      const location = await db.saveLocation('New York');
      
      expect(location).toHaveProperty('name', 'New York');
      expect(location).toHaveProperty('locationId', 'New York');
      expect(location).toHaveProperty('createdAt');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    test('deleteLocationByName should fail if participants are registered there', async () => {
      // Seed test data
      seedMockItems('locations', [{ name: 'Chicago' }]);
      seedMockItems('registrations', [
        { userId: 'user1', name: 'User 1', location: 'Chicago' }
      ]);

      await expect(db.deleteLocationByName('Chicago')).rejects.toThrow(
        'Cannot delete location "Chicago" as 1 participant(s) are registered there.'
      );
    });

    test('deleteLocationByName should succeed if no participants are registered', async () => {
      // Seed test data
      seedMockItems('locations', [{ name: 'Chicago' }]);
      
      await expect(db.deleteLocationByName('Chicago')).resolves.not.toThrow();
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2); // One for checking participants, one for deletion
    });
  });

  describe('Registration operations', () => {
    test('saveRegistration should store user registration data', async () => {
      const registration = {
        name: 'John Doe',
        email: 'john@example.com',
        availableDays: ['Monday', 'Wednesday'],
        location: 'Dallas'
      };

      const savedReg = await db.saveRegistration(registration, 'user123');
      
      expect(savedReg).toMatchObject({
        ...registration,
        userId: 'user123'
      });
      expect(savedReg).toHaveProperty('createdAt');
      expect(savedReg).toHaveProperty('updatedAt');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    test('saveRegistration should fail without location', async () => {
      const registration = {
        name: 'John Doe',
        email: 'john@example.com',
        availableDays: ['Monday', 'Wednesday']
      };

      await expect(db.saveRegistration(registration, 'user123')).rejects.toThrow(
        'Location is required for registration.'
      );
    });

    test('getRegistrationByUserId should return user registration', async () => {
      // Seed test data
      const testReg = { 
        userId: 'user456', 
        name: 'Jane Doe', 
        email: 'jane@example.com',
        location: 'Denver' 
      };
      seedMockItems('registrations', [testReg]);

      const registration = await db.getRegistrationByUserId('user456');
      
      expect(registration).toEqual(testReg);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    test('getAllRegistrations should return all registrations', async () => {
      // Seed test data
      const testRegs = [
        { userId: 'user1', name: 'User 1', location: 'Boston' },
        { userId: 'user2', name: 'User 2', location: 'Raleigh' },
        { userId: 'user3', name: 'User 3', location: 'Boston' }
      ];
      seedMockItems('registrations', testRegs);

      const registrations = await db.getAllRegistrations();
      
      expect(registrations).toHaveLength(3);
      expect(registrations).toEqual(expect.arrayContaining(testRegs));
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    test('getAllRegistrations should filter by location', async () => {
      // Seed test data
      seedMockItems('registrations', [
        { userId: 'user1', name: 'User 1', location: 'Boston' },
        { userId: 'user2', name: 'User 2', location: 'Raleigh' },
        { userId: 'user3', name: 'User 3', location: 'Boston' }
      ]);

      // Note: The mock implementation needs to be improved to properly filter
      // This test verifies the code calls the right AWS methods with filter params
      await db.getAllRegistrations('Boston');
      
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
      // Verify filter params were included in the command
      expect(mockDynamoClient.send.mock.calls[0][0].input).toHaveProperty('FilterExpression');
      expect(mockDynamoClient.send.mock.calls[0][0].input.ExpressionAttributeValues[':loc']).toBe('Boston');
    });

    test('deleteRegistration should remove a user registration', async () => {
      // Seed test data
      seedMockItems('registrations', [
        { userId: 'user1', name: 'User 1', location: 'Boston' }
      ]);

      await db.deleteRegistration('user1');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Match history operations', () => {
    test('saveMatchHistory should store a match round', async () => {
      const matches = [
        { 
          users: ['user1', 'user2'], 
          commonDays: ['Monday'], 
          location: 'Boston'
        },
        { 
          users: ['user3', 'user4'], 
          commonDays: ['Wednesday'], 
          location: 'Raleigh'
        }
      ];

      const savedHistory = await db.saveMatchHistory(matches);
      
      expect(savedHistory).toHaveProperty('matchId');
      expect(savedHistory).toHaveProperty('date');
      expect(savedHistory.matches).toEqual(matches);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    test('saveMatchHistory should fail if any match is missing location', async () => {
      const matches = [
        { 
          users: ['user1', 'user2'], 
          commonDays: ['Monday'], 
          location: 'Boston'
        },
        { 
          users: ['user3', 'user4'], 
          commonDays: ['Wednesday']
          // Missing location
        }
      ];

      await expect(db.saveMatchHistory(matches)).rejects.toThrow(
        'Internal error: Not all matches have a location specified for saving history.'
      );
    });

    test('getMatchHistory should return all match rounds', async () => {
      // Seed test data
      const testHistory = [
        {
          matchId: '1',
          date: '2023-01-01T00:00:00.000Z',
          matches: [
            { users: ['user1', 'user2'], commonDays: ['Monday'], location: 'Boston' },
            { users: ['user3', 'user4'], commonDays: ['Wednesday'], location: 'Raleigh' }
          ]
        },
        {
          matchId: '2',
          date: '2023-02-01T00:00:00.000Z',
          matches: [
            { users: ['user1', 'user5'], commonDays: ['Friday'], location: 'Boston' },
            { users: ['user3', 'user6'], commonDays: ['Tuesday'], location: 'Raleigh' }
          ]
        }
      ];
      seedMockItems('matchhistory', testHistory);

      const history = await db.getMatchHistory();
      
      // Should be sorted by date descending
      expect(history[0].matchId).toBe('2');
      expect(history[1].matchId).toBe('1');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
    });

    test('getMatchHistory should filter by location', async () => {
      // Seed test data
      const testHistory = [
        {
          matchId: '1',
          date: '2023-01-01T00:00:00.000Z',
          matches: [
            { users: ['user1', 'user2'], commonDays: ['Monday'], location: 'Boston' },
            { users: ['user3', 'user4'], commonDays: ['Wednesday'], location: 'Raleigh' }
          ]
        },
        {
          matchId: '2',
          date: '2023-02-01T00:00:00.000Z',
          matches: [
            { users: ['user1', 'user5'], commonDays: ['Friday'], location: 'Boston' }
          ]
        }
      ];
      seedMockItems('matchhistory', testHistory);

      const history = await db.getMatchHistory('Boston');
      
      // Should include both rounds but filter matches
      expect(history).toHaveLength(2);
      history.forEach(round => {
        round.matches.forEach(match => {
          expect(match.location).toBe('Boston');
        });
      });
      
      // The first round should have 1 match, the second should have 1 match
      expect(history[0].matches).toHaveLength(1);
      expect(history[1].matches).toHaveLength(1);
    });
  });
}); 