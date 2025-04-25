/**
 * Mock for DynamoDB client operations
 */

const mockItems = {
  users: [],
  locations: [],
  matches: [],
  feedback: []
};

// Mock DynamoDB send operation with various command responses
const mockDynamoClient = {
  send: jest.fn().mockImplementation((command) => {
    // Handle different command types
    if (command.constructor.name === 'PutItemCommand') {
      const tableName = command.input.TableName.toLowerCase();
      const item = command.input.Item;
      
      mockItems[tableName] = mockItems[tableName] || [];
      mockItems[tableName].push(item);
      
      return Promise.resolve({ 
        $metadata: { 
          httpStatusCode: 200 
        } 
      });
    }
    
    if (command.constructor.name === 'GetItemCommand') {
      const tableName = command.input.TableName.toLowerCase();
      const key = command.input.Key;
      
      const items = mockItems[tableName] || [];
      // Find matching item by key
      const item = items.find(i => {
        return Object.keys(key).every(k => i[k] && i[k] === key[k]);
      });
      
      return Promise.resolve({
        Item: item,
        $metadata: { 
          httpStatusCode: 200 
        }
      });
    }
    
    if (command.constructor.name === 'ScanCommand') {
      const tableName = command.input.TableName.toLowerCase();
      const items = mockItems[tableName] || [];
      
      return Promise.resolve({
        Items: items,
        $metadata: { 
          httpStatusCode: 200 
        },
        Count: items.length,
        ScannedCount: items.length
      });
    }
    
    if (command.constructor.name === 'QueryCommand') {
      const tableName = command.input.TableName.toLowerCase();
      const items = mockItems[tableName] || [];
      
      // Basic filtering based on key condition expression (simplified)
      const filteredItems = items;
      
      return Promise.resolve({
        Items: filteredItems,
        $metadata: { 
          httpStatusCode: 200 
        },
        Count: filteredItems.length,
        ScannedCount: items.length
      });
    }
    
    if (command.constructor.name === 'DeleteItemCommand') {
      const tableName = command.input.TableName.toLowerCase();
      const key = command.input.Key;
      
      mockItems[tableName] = (mockItems[tableName] || []).filter(i => {
        return !Object.keys(key).every(k => i[k] && i[k] === key[k]);
      });
      
      return Promise.resolve({
        $metadata: { 
          httpStatusCode: 200 
        }
      });
    }
    
    // Default fallback
    return Promise.resolve({
      $metadata: { 
        httpStatusCode: 200 
      }
    });
  })
};

// Reset mock data between tests
const clearMockItems = () => {
  Object.keys(mockItems).forEach(key => {
    mockItems[key] = [];
  });
};

// Helper to pre-populate mock data
const seedMockItems = (tableName, items) => {
  mockItems[tableName.toLowerCase()] = [...items];
};

module.exports = {
  mockDynamoClient,
  clearMockItems,
  seedMockItems,
  mockItems
}; 