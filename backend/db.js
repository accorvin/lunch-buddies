const { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDB, registrationsTable, matchHistoryTable } = require('./dynamodb');

// Registration operations
async function saveRegistration(registration, userId) {
  const item = {
    ...registration,
    userId,
    id: registration.id || Date.now().toString(),
    createdAt: registration.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await dynamoDB.send(new PutCommand({
    TableName: registrationsTable,
    Item: item
  }));

  return item;
}

async function getRegistrationByUserId(userId) {
  const result = await dynamoDB.send(new GetCommand({
    TableName: registrationsTable,
    Key: { userId }
  }));

  return result.Item || null;
}

async function getAllRegistrations() {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: registrationsTable
  }));

  return result.Items || [];
}

async function deleteRegistration(userId) {
  await dynamoDB.send(new DeleteCommand({
    TableName: registrationsTable,
    Key: { userId }
  }));
}

// Match history operations
async function saveMatchHistory(matches) {
  const matchRound = {
    matchId: Date.now().toString(),
    date: new Date().toISOString(),
    matches
  };

  await dynamoDB.send(new PutCommand({
    TableName: matchHistoryTable,
    Item: matchRound
  }));

  return matchRound;
}

async function getMatchHistory() {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: matchHistoryTable
  }));

  return result.Items || [];
}

module.exports = {
  saveRegistration,
  getRegistrationByUserId,
  getAllRegistrations,
  deleteRegistration,
  saveMatchHistory,
  getMatchHistory
}; 