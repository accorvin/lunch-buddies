const { dynamoDB, registrationsTable, matchHistoryTable } = require('../dynamodb');
const { CreateTableCommand } = require('@aws-sdk/client-dynamodb');

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
    console.log('Registrations table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('Registrations table already exists');
    } else {
      console.error('Error creating registrations table:', error);
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
    console.log('Match history table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('Match history table already exists');
    } else {
      console.error('Error creating match history table:', error);
    }
  }
}

async function setupTables() {
  console.log('Setting up DynamoDB tables...');
  await createRegistrationsTable();
  await createMatchHistoryTable();
  console.log('DynamoDB setup completed');
}

setupTables().catch(console.error); 
setupTables(); 