// In-memory storage for mock data
const mockData = {
  registrations: [],
  locations: [],
  matchHistory: []
};

// Mock DynamoDB client
const mockDynamoClient = {
  send: jest.fn().mockImplementation(async (command) => {
    const { input } = command;
    
    // Handle Get command
    if (command.constructor.name === 'GetCommand') {
      const { TableName, Key } = input;
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
      
      if (TableName === 'registrations') {
        const index = mockData.registrations.findIndex(r => r.userId === Item.userId);
        if (index >= 0) {
          mockData.registrations[index] = Item;
        } else {
          mockData.registrations.push(Item);
        }
      } else if (TableName === 'locations') {
        mockData.locations.push(Item);
      } else if (TableName === 'matchHistory') {
        mockData.matchHistory.push(Item);
      }
      
      return { Item };
    }
    
    // Handle Delete command
    if (command.constructor.name === 'DeleteCommand') {
      const { TableName, Key } = input;
      const userId = Key.userId;
      
      if (TableName === 'registrations') {
        mockData.registrations = mockData.registrations.filter(r => r.userId !== userId);
      } else if (TableName === 'locations') {
        const locationName = Key.name;
        mockData.locations = mockData.locations.filter(l => l.name !== locationName);
      }
      
      return {};
    }
    
    // Handle Scan command
    if (command.constructor.name === 'ScanCommand') {
      const { TableName } = input;
      const items = mockData[TableName] || [];
      return { Items: items };
    }
    
    throw new Error(`Unhandled command: ${command.constructor.name}`);
  })
};

// Helper functions for test setup
function clearMockItems() {
  mockData.registrations = [];
  mockData.locations = [];
  mockData.matchHistory = [];
}

function seedMockItems(tableName, items) {
  mockData[tableName] = items;
}

module.exports = {
  mockDynamoClient,
  clearMockItems,
  seedMockItems
}; 