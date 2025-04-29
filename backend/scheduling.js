const db = require('./db');

/**
 * Gets the manually set next match date if it exists, otherwise calculates it
 * @returns {Promise<Date>} The next date when matches should be run
 */
async function getNextMatchDate() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Get the last match date from the database
  const lastMatchDate = await db.getLastMatchDate();
  console.log('Last match date:', lastMatchDate);
  
  // If we have a last match date that's in the future, use it
  if (lastMatchDate) {
    const lastMatchDay = new Date(lastMatchDate);
    if (lastMatchDay > today) {
      console.log('Using manually set future match date:', lastMatchDay);
      return lastMatchDay;
    }
    
    // If it's been less than 3 weeks since the last match, schedule for 3 weeks from the last match
    const threeWeeksFromLastMatch = new Date(lastMatchDay);
    threeWeeksFromLastMatch.setDate(lastMatchDay.getDate() + 21);
    
    console.log('Today:', today);
    console.log('Three weeks from last match:', threeWeeksFromLastMatch);
    
    if (today < threeWeeksFromLastMatch) {
      console.log('Returning three weeks from last match');
      return threeWeeksFromLastMatch;
    }
  }
  
  // If it's Friday and we haven't run matches this week, run them today
  if (today.getDay() === 5) { // 5 is Friday
    if (!lastMatchDate || 
        new Date(lastMatchDate).getTime() < today.getTime()) {
      console.log('Returning today (Friday)');
      return today;
    }
  }
  
  // Calculate next Friday
  let nextFriday = new Date(today);
  const daysUntilFriday = (5 - nextFriday.getDay() + 7) % 7;
  nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
  
  console.log('Returning next Friday:', nextFriday);
  return nextFriday;
}

/**
 * Checks if it's time to run matches and runs them if needed
 * @returns {Promise<Array>} Array of matches if matches were run, undefined otherwise
 */
async function checkAndRunMatches() {
  try {
    const now = new Date();
    console.log('Current date:', now);
    
    const lastMatchDate = await db.getLastMatchDate();
    console.log('Last match date:', lastMatchDate);
    
    const nextMatchDate = await getNextMatchDate();
    console.log('Next match date:', nextMatchDate);
    
    // Compare dates by converting to timestamps
    const nowTimestamp = now.getTime();
    const nextMatchTimestamp = nextMatchDate.getTime();
    
    console.log('Now timestamp:', nowTimestamp);
    console.log('Next match timestamp:', nextMatchTimestamp);
    
    // If we've never run matches or it's time to run them
    if (!lastMatchDate || nowTimestamp >= nextMatchTimestamp) {
      console.log('Running matches');
      // Run matches
      const matches = await db.performMatching();
      // Update last match date
      await db.setLastMatchDate(now);
      return matches;
    }
    console.log('Not running matches');
    return undefined;
  } catch (err) {
    console.error('Error checking and running matches:', err);
    return undefined;
  }
}

module.exports = {
  getNextMatchDate,
  checkAndRunMatches
}; 