const { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDB, registrationsTable, matchHistoryTable, locationsTable } = require('./dynamodb');

// Location operations
async function getAllLocations() {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: locationsTable
  }));
  // Assuming locations have a 'name' attribute
  return result.Items?.map(item => item.name).sort() || [];
}

async function saveLocation(locationName) {
  const item = {
    locationId: locationName, // Use locationId as the key in production
    name: locationName,
    createdAt: new Date().toISOString()
  };
  await dynamoDB.send(new PutCommand({
    TableName: locationsTable,
    Item: item
  }));
  return item;
}

async function deleteLocationByName(locationName) {
  // Check if any registrations exist for this location before deleting
  const registrations = await getAllRegistrations(locationName);
  if (registrations.length > 0) {
    throw new Error(`Cannot delete location "${locationName}" as ${registrations.length} participant(s) are registered there.`);
  }

  await dynamoDB.send(new DeleteCommand({
    TableName: locationsTable,
    Key: { name: locationName }
  }));
}

// Registration operations
async function saveRegistration(registration, userId) {
  // Ensure location is included
  if (!registration.location) {
    throw new Error('Location is required for registration.');
  }
  const item = {
    ...registration,
    userId, // Partition Key
    // id is no longer needed if userId is the key
    createdAt: registration.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Remove potentially problematic id field if it exists from old structure
  delete item.id; 

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

// Add optional location filter
async function getAllRegistrations(location = null) {
  const params = {
    TableName: registrationsTable
  };

  // If a location is specified, filter the results
  // NOTE: This scans the entire table. For performance, add a GSI on 'location'.
  if (location) {
    params.FilterExpression = '#loc = :loc';
    params.ExpressionAttributeNames = { '#loc': 'location' };
    params.ExpressionAttributeValues = { ':loc': location };
  }

  const result = await dynamoDB.send(new ScanCommand(params));
  return result.Items || [];
}

async function deleteRegistration(userId) {
  await dynamoDB.send(new DeleteCommand({
    TableName: registrationsTable,
    Key: { userId }
  }));
}

// Match history operations

// `matches` should be an array of match objects, each including a `location`
async function saveMatchHistory(matches) {
  // Validate that all matches have a location
  if (!matches.every(match => match.location)) {
      throw new Error("Internal error: Not all matches have a location specified for saving history.");
  }
  // It might make more sense to save match rounds per location, 
  // or ensure the calling function only passes matches for a single location at a time.
  // For now, assume the input `matches` array contains match objects structured like:
  // { users: [userId1, userId2], commonDays: [...], location: 'Raleigh', ... }

  const matchRound = {
    matchId: Date.now().toString(), // Primary Key for matchHistoryTable
    date: new Date().toISOString(),
    matches // Array of match objects, each including location
  };

  await dynamoDB.send(new PutCommand({
    TableName: matchHistoryTable,
    Item: matchRound
  }));

  return matchRound;
}

// Add optional location filter
async function getMatchHistory(location = null) {
  const result = await dynamoDB.send(new ScanCommand({
    TableName: matchHistoryTable
  }));

  let history = result.Items || [];

  if (location) {
    // Filter the matches *within* each round
    history = history.map(round => {
      const filteredMatches = round.matches.filter(match => match.location === location);
      // Return the round only if it has matches for the specified location
      return filteredMatches.length > 0 ? { ...round, matches: filteredMatches } : null;
    }).filter(round => round !== null); // Remove rounds that became empty after filtering
  }

  // Sort by date descending (most recent first)
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return history;
}

module.exports = {
  // Locations
  getAllLocations,
  saveLocation,
  deleteLocationByName, // Changed from deleteLocationById

  // Registrations
  saveRegistration,
  getRegistrationByUserId,
  getAllRegistrations,
  deleteRegistration,

  // Match History
  saveMatchHistory,
  getMatchHistory
}; 