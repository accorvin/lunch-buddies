require('dotenv').config();
const { CreateTableCommand } = require('@aws-sdk/client-dynamodb');
const { dynamoDB, registrationsTable, matchHistoryTable, locationsTable, matchScheduleTable, tablePrefix } = require('../dynamodb');

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
    await dynamoDB.send(command);
    console.log('✅ Registrations table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️ Registrations table already exists');
    } else {
      console.error('❌ Error creating registrations table:', error);
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
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
    await dynamoDB.send(command);
    console.log('✅ Match history table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️ Match history table already exists');
    } else {
      console.error('❌ Error creating match history table:', error);
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    }
  }
}

async function createLocationsTable() {
  try {
    const command = new CreateTableCommand({
      TableName: locationsTable,
      KeySchema: [
        { AttributeName: 'locationId', KeyType: 'HASH' }  // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'locationId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });
    await dynamoDB.send(command);
    console.log('✅ Locations table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️ Locations table already exists');
    } else {
      console.error('❌ Error creating locations table:', error);
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    }
  }
}

async function createMatchScheduleTable() {
  try {
    const command = new CreateTableCommand({
      TableName: matchScheduleTable,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }  // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    });
    await dynamoDB.send(command);
    console.log('✅ Match schedule table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️ Match schedule table already exists');
    } else {
      console.error('❌ Error creating match schedule table:', error);
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    }
  }
}

async function setupTables() {
  console.log('🚀 Setting up DynamoDB tables...');
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Table prefix: ${tablePrefix || 'none'}`);
  
  await createRegistrationsTable();
  await createMatchHistoryTable();
  await createLocationsTable();
  await createMatchScheduleTable();
  
  console.log('✨ DynamoDB setup completed');
}

setupTables().catch(console.error); 