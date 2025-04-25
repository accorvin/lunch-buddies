const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Configuration for DynamoDB
const isLocal = process.env.NODE_ENV === 'development';

// For local development, we need to provide a more complete configuration
const dynamoDBConfig = isLocal ? {
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
} : {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  maxAttempts: 3,
  retryMode: 'adaptive'
};

// Create the DynamoDB client
const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);

// Create the DynamoDB Document client with marshalling options
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true
  }
});

// Table names - use environment-specific prefixes in production
const tablePrefix = isLocal ? '' : process.env.DYNAMODB_TABLE_PREFIX || '';
const registrationsTable = `${tablePrefix}LunchBuddyRegistrations`;
const matchHistoryTable = `${tablePrefix}LunchBuddyMatchHistory`;
const locationsTable = `${tablePrefix}LunchBuddyLocations`;

module.exports = {
  dynamoDB,
  registrationsTable,
  matchHistoryTable,
  locationsTable
}; 