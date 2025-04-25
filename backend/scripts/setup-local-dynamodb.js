const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

// Create a DynamoDB client specifically for local setup
const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

// Table names
const registrationsTable = 'LunchBuddyRegistrations';
const matchHistoryTable = 'LunchBuddyMatchHistory';
const locationsTable = 'LunchBuddyLocations';

async function createRegistrationsTable() {
  try {
    const command = new CreateTableCommand({
      TableName: registrationsTable,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' }  // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });
    await client.send(command);
    console.log('✅ Registrations table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  Registrations table already exists');
    } else {
      console.error('❌ Error creating registrations table:', error);
      throw error;
    }
  }
}

async function createMatchHistoryTable() {
  try {
    const command = new CreateTableCommand({
      TableName: matchHistoryTable,
      KeySchema: [
        { AttributeName: 'matchId', KeyType: 'HASH' }  // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'matchId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });
    await client.send(command);
    console.log('✅ Match history table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  Match history table already exists');
    } else {
      console.error('❌ Error creating match history table:', error);
      throw error;
    }
  }
}

async function createLocationsTable() {
  try {
    const command = new CreateTableCommand({
      TableName: locationsTable,
      KeySchema: [
        { AttributeName: 'name', KeyType: 'HASH' }  // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'name', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });
    await client.send(command);
    console.log('✅ Locations table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  Locations table already exists');
    } else {
      console.error('❌ Error creating locations table:', error);
      throw error;
    }
  }
}

async function setupTables() {
  console.log('🚀 Setting up DynamoDB tables...');
  await createRegistrationsTable();
  await createMatchHistoryTable();
  await createLocationsTable();
  console.log('✨ DynamoDB setup completed');
}

// Run the setup
setupTables().catch(error => {
  console.error('❌ Failed to setup DynamoDB:', error);
  process.exit(1);
}); 