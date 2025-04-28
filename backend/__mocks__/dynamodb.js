// In-memory storage for mock data
const mockData = {
  registrations: [],
  locations: [],
  matchHistory: [],
  matchSchedule: {}
};

// Mock DynamoDB client
const mockDynamoClient = {
  send: jest.fn().mockImplementation(async (command) => {
    const { input } = command;
    
    // Handle Get command
    if (command.constructor.name === 'GetCommand') {
      const { TableName, Key } = input;
      if (TableName === 'matchSchedule') {
        return { Item: mockData.matchSchedule[Key.id] || null };
      }
      const items = mockData[TableName] || [];
      const item = items.find(i => i.userId === Key.userId);
      return { Item: item || null };
    }
    
    // Handle Query command
    if (command.constructor.name === 'QueryCommand') {
      const { TableName, FilterExpression, ExpressionAttributeValues } = input;
      let items = mockData[TableName] || [];
      
      // Apply location filter if present
      if (FilterExpression && ExpressionAttributeValues) {
        const location = ExpressionAttributeValues[':loc'];
        items = items.filter(item => item.location === location);
      }
      
      return { Items: items };
    }
    
    // Handle Put command
    if (command.constructor.name === 'PutCommand') {
      const { TableName, Item } = input;
      
      if (TableName === 'matchSchedule') {
        mockData.matchSchedule[Item.id] = Item;
        return { Item };
      }
      
      if (TableName === 'registrations') {
        const index = mockData.registrations.findIndex(r => r.userId === Item.userId);
        if (index >= 0) {
          mockData.registrations[index] = Item;
        } else {
          mockData.registrations.push(Item);
        }
        return { Item };
      }
      
      if (TableName === 'locations') {
        const index = mockData.locations.findIndex(l => l.locationId === Item.locationId);
        if (index >= 0) {
          mockData.locations[index] = Item;
        } else {
          mockData.locations.push(Item);
        }
        return { Item };
      }
      
      if (TableName === 'matchHistory') {
        mockData.matchHistory.push(Item);
        return { Item };
      }
      
      return { Item };
    }
    
    // Handle Delete command
    if (command.constructor.name === 'DeleteCommand') {
      const { TableName, Key } = input;
      if (TableName === 'registrations') {
        mockData.registrations = mockData.registrations.filter(r => r.userId !== Key.userId);
      }
      if (TableName === 'locations') {
        mockData.locations = mockData.locations.filter(l => l.locationId !== Key.locationId);
      }
      return {};
    }
    
    // Handle Scan command
    if (command.constructor.name === 'ScanCommand') {
      const { TableName } = input;
      return { Items: mockData[TableName] || [] };
    }
    
    throw new Error(`Unsupported command: ${command.constructor.name}`);
  })
};

// Helper functions for managing mock data
function clearMockItems() {
  mockData.registrations = [];
  mockData.locations = [];
  mockData.matchHistory = [];
  mockData.matchSchedule = {};
}

function seedMockItems(tableName, items) {
  if (tableName === 'matchSchedule') {
    items.forEach(item => {
      mockData.matchSchedule[item.id] = item;
    });
  } else {
    mockData[tableName] = items;
  }
}

module.exports = {
  dynamoDB: mockDynamoClient,
  registrationsTable: 'registrations',
  matchHistoryTable: 'matchHistory',
  locationsTable: 'locations',
  matchScheduleTable: 'matchSchedule',
  clearMockItems,
  seedMockItems,
  mockDynamoClient  // Export this for test spying
}; 