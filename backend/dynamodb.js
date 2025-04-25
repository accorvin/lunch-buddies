const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Configuration for DynamoDB
const isLocal = process.env.NODE_ENV === 'development';

const dynamoDBConfig = isLocal ? {
  region: 'localhost',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy'
  }
} : {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

// Create the DynamoDB client
const dynamoDBClient = new DynamoDBClient(dynamoDBConfig);

// Create the DynamoDB Document client
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

// Table names - use environment-specific prefixes in production
const tablePrefix = isLocal ? '' : process.env.DYNAMODB_TABLE_PREFIX || '';
const registrationsTable = `${tablePrefix}LunchBuddyRegistrations`;
const matchHistoryTable = `${tablePrefix}LunchBuddyMatchHistory`;

module.exports = {
  dynamoDB,
  registrationsTable,
  matchHistoryTable
}; 