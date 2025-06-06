const { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamoDB, registrationsTable, matchHistoryTable, locationsTable, matchScheduleTable } = require('./dynamodb');

// Location operations
async function getAllLocations() {
  try {
    const command = new ScanCommand({
      TableName: locationsTable
    });
    const response = await dynamoDB.send(command);
    const locations = response.Items || [];
    // Sort the locations by name and return just the names
    return locations
      .map(location => location.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error getting locations:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      requestId: error.$metadata?.requestId,
      retryAttempts: error.$metadata?.retryAttempts
    });
    throw error;
  }
}

async function getAllLocationsWithDetails() {
  try {
    const command = new ScanCommand({
      TableName: locationsTable
    });
    const response = await dynamoDB.send(command);
    const locations = response.Items || [];
    // Sort the locations by name and return full objects
    return locations
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(location => ({
        locationId: location.locationId,
        name: location.name,
        customMessage: location.customMessage || null,
        createdAt: location.createdAt
      }));
  } catch (error) {
    console.error('Error getting locations with details:', error);
    throw error;
  }
}

async function getLocationMessage(locationName) {
  try {
    const command = new GetCommand({
      TableName: locationsTable,
      Key: { locationId: locationName }
    });
    const response = await dynamoDB.send(command);
    if (response.Item) {
      return response.Item.customMessage || DEFAULT_MATCH_MESSAGE;
    }
    return DEFAULT_MATCH_MESSAGE;
  } catch (error) {
    console.error('Error getting location message:', error);
    return DEFAULT_MATCH_MESSAGE; // Fallback to default
  }
}

async function updateLocationMessage(locationName, customMessage) {
  try {
    // Get existing location first
    const getCommand = new GetCommand({
      TableName: locationsTable,
      Key: { locationId: locationName }
    });
    const response = await dynamoDB.send(getCommand);
    
    if (!response.Item) {
      throw new Error(`Location "${locationName}" not found`);
    }

    // Update with new message
    const updateItem = {
      ...response.Item,
      customMessage: customMessage || null,
      updatedAt: new Date().toISOString()
    };

    await dynamoDB.send(new PutCommand({
      TableName: locationsTable,
      Item: updateItem
    }));

    return updateItem;
  } catch (error) {
    console.error('Error updating location message:', error);
    throw error;
  }
}

// Default notification message template
const DEFAULT_MATCH_MESSAGE = `🎉 You've been matched for lunch in {location} with {buddyName}!

Common available days: {commonDays}
Email: {buddyEmail}

Reach out to schedule your lunch! 🍽️`;

async function saveLocation(locationName, customMessage = null) {
  const item = {
    locationId: locationName, // Use locationId as the key in production
    name: locationName,
    createdAt: new Date().toISOString(),
    customMessage: customMessage || null // Store custom message if provided
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
    Key: { locationId: locationName }
  }));
}

// Registration operations
async function saveRegistration(registration, userId) {
  try {
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

    const command = new PutCommand({
      TableName: registrationsTable,
      Item: item
    });
    await dynamoDB.send(command);

    return item;
  } catch (error) {
    console.error('Error saving registration:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      requestId: error.$metadata?.requestId,
      retryAttempts: error.$metadata?.retryAttempts
    });
    throw error;
  }
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
  try {
    const command = new DeleteCommand({
      TableName: registrationsTable,
      Key: { userId }
    });
    await dynamoDB.send(command);
  } catch (error) {
    console.error('Error deleting registration:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      requestId: error.$metadata?.requestId,
      retryAttempts: error.$metadata?.retryAttempts
    });
    throw error;
  }
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

// Match schedule operations
async function getLastMatchDate() {
  try {
    const result = await dynamoDB.send(new GetCommand({
      TableName: matchScheduleTable,
      Key: { id: 'lastMatchDate' }
    }));
    
    if (result.Item) {
      return new Date(result.Item.date);
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting last match date:', error);
    return null;
  }
}

async function setLastMatchDate(date) {
  try {
    await dynamoDB.send(new PutCommand({
      TableName: matchScheduleTable,
      Item: {
        id: 'lastMatchDate',
        date: date.toISOString()
      }
    }));
    return true;
  } catch (error) {
    console.error('❌ Error setting last match date:', error);
    return false;
  }
}

// Matching operations
async function performMatching() {
  try {
    // Get all registrations
    const registrations = await getAllRegistrations();
    
    // Group registrations by location
    const registrationsByLocation = {};
    registrations.forEach(reg => {
      if (!registrationsByLocation[reg.location]) {
        registrationsByLocation[reg.location] = [];
      }
      registrationsByLocation[reg.location].push(reg);
    });

    const matches = [];

    // Process each location separately
    for (const [location, locationRegistrations] of Object.entries(registrationsByLocation)) {
      // Shuffle registrations to randomize matches
      const shuffledRegistrations = [...locationRegistrations].sort(() => Math.random() - 0.5);
      
      // Create pairs
      for (let i = 0; i < shuffledRegistrations.length; i += 2) {
        if (i + 1 < shuffledRegistrations.length) {
          matches.push({
            users: [
              shuffledRegistrations[i].userId,
              shuffledRegistrations[i + 1].userId
            ],
            location,
            date: new Date().toISOString()
          });
        }
      }
    }

    // Save matches to history
    if (matches.length > 0) {
      await saveMatchHistory(matches);
    }

    return matches;
  } catch (error) {
    console.error('Error performing matching:', error);
    throw error;
  }
}

module.exports = {
  // Locations
  getAllLocations,
  getAllLocationsWithDetails,
  getLocationMessage,
  updateLocationMessage,
  saveLocation,
  deleteLocationByName,
  DEFAULT_MATCH_MESSAGE,

  // Registrations
  saveRegistration,
  getRegistrationByUserId,
  getAllRegistrations,
  deleteRegistration,

  // Match History
  saveMatchHistory,
  getMatchHistory,

  // Match Schedule
  getLastMatchDate,
  setLastMatchDate,

  // Matching
  performMatching
}; 