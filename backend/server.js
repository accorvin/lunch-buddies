require('dotenv').config();
const path = require("path");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const express = require("express");
const bodyParser = require("body-parser");
const { 
  getAllLocations,
  saveLocation,
  deleteLocationByName,
  saveRegistration, 
  getRegistrationByUserId, 
  getAllRegistrations, 
  deleteRegistration,
  saveMatchHistory,
  getMatchHistory,
  getLastMatchDate,
  setLastMatchDate
} = require('./db');
const scheduling = require('./scheduling');

// Required environment variables
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_ADMIN_EMAIL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'JWT_SECRET',
  'BACKEND_URL'
];

// Define weekdays array
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Validate environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize passport
app.use(passport.initialize());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://main.d3jm55ngs3zhck.amplifyapp.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      console.error('❌ CORS error:', msg, 'Origin:', origin);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`\n🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('📝 Request Headers:', req.headers);
  next();
});

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get admin emails from environment variable
const adminEmails = process.env.ADMIN_EMAILS ? 
  process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : 
  [];

// Admin check middleware
const isAdmin = (req, res, next) => {
  const userEmail = req.user?.email;
  
  if (!userEmail) {
      return res.status(401).json({ error: 'User email not found in token' });
  }
  
  // Check if user is admin based on token or environment settings
  if (req.user.isAdmin || 
      (process.env.NODE_ENV === 'development' && process.env.DEFAULT_ADMIN_IN_DEV === 'true') ||
      adminEmails.includes(userEmail)) {
      next();
  } else {
      console.warn(`🚫 Admin access denied for user: ${userEmail}`);
      return res.status(403).json({ error: 'Admin privileges required' });
  }
};

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    proxy: process.env.NODE_ENV === 'production'
  },
  function(accessToken, refreshToken, profile, done) {
    console.log('🔐 Google authentication successful for user:', profile.displayName);
    console.log('📧 User email:', profile.emails?.[0]?.value);
    return done(null, profile);
  }
));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Passport deserialization
passport.deserializeUser((id, done) => {
  // Since we're using JWT tokens now, we don't need to store the full user object
  // Just pass the ID through
  done(null, { id });
});

// Google OAuth routes
app.get('/auth/google',
  (req, res, next) => {
    console.log('🔐 Initiating Google OAuth flow');
    console.log('🌐 Backend URL:', process.env.BACKEND_URL);
    console.log('🔑 Google Client ID:', process.env.GOOGLE_CLIENT_ID);
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }
);

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    console.log('✅ Google authentication callback successful');
    console.log('👤 Authenticated user:', req.user);
    
    const userEmail = req.user.emails?.[0]?.value;
    console.log('📧 User email:', userEmail);
    
    const isAdmin = (process.env.NODE_ENV === 'development' && process.env.DEFAULT_ADMIN_IN_DEV === 'true') || 
                   (process.env.ADMIN_EMAILS && 
                    process.env.ADMIN_EMAILS.split(',').map(email => email.trim()).includes(userEmail));
    console.log('👑 Is admin:', isAdmin);
    console.log('🔧 Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      DEFAULT_ADMIN_IN_DEV: process.env.DEFAULT_ADMIN_IN_DEV,
      ADMIN_EMAILS: process.env.ADMIN_EMAILS
    });
    
    // Create JWT token
    const token = jwt.sign({
      id: req.user.id,
      name: req.user.displayName,
      email: userEmail,
      picture: req.user.photos?.[0]?.value,
      isAdmin: isAdmin || false // Ensure isAdmin is always a boolean
    }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    console.log('🔐 Token created with payload:', {
      id: req.user.id,
      name: req.user.displayName,
      email: userEmail,
      isAdmin: isAdmin
    });
    
    // Redirect to frontend with token
    const frontendUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
    frontendUrl.searchParams.set('token', token);
    
    console.log('🔄 Redirecting to:', frontendUrl.toString());
    
    res.redirect(frontendUrl.toString());
  }
);

// Protected routes
app.get('/auth/current-user', authenticateToken, (req, res) => {
  console.log('👥 Current user request received');
  console.log('👤 User:', req.user);
  res.json(req.user);
});

app.post('/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

app.use(bodyParser.json());

// Set NODE_ENV to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('⚠️  NODE_ENV not set, defaulting to development mode');
}

// Updated Validation
function validateRegistration(reg) {
  const errors = [];
  
  if (!reg.name || typeof reg.name !== 'string' || reg.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!reg.email || typeof reg.email !== 'string' || !reg.email.includes('@')) {
    errors.push('Valid email is required');
  }
  
  if (!Array.isArray(reg.availableDays) || reg.availableDays.length === 0) {
    errors.push('At least one available day must be selected');
  }

  // Add location validation
  if (!reg.location || typeof reg.location !== 'string' || reg.location.trim().length === 0) {
      errors.push('Location is required');
  }
  
  return errors;
}

// Matching configuration
const MATCHING_INTERVAL_DAYS = 21; // 3 weeks
const TEST_MODE = process.env.NODE_ENV === 'development';

// Slack API functions
async function getSlackUserIdByEmail(email) {
  try {
    const url = new URL("https://slack.com/api/users.lookupByEmail");
    url.searchParams.set("email", email);
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`❌ Failed to lookup Slack user by email (${email}):`, data.error);
      return null;
    }
    return data.user.id;
  } catch (err) {
    console.error(`❌ Error looking up Slack user ID for ${email}:`, err);
    return null;
  }
}

async function sendSlackDM(userId, message) {
  if (!userId) {
    console.error("❌ Cannot send Slack DM: userId is null");
    return false;
  }
  try {
    console.log(`📨 Sending Slack DM to userId: ${userId}`);
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        channel: userId,
        text: message
      })
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`❌ Failed to send Slack message to ${userId}:`, data.error);
      return false;
    }
    console.log(`✅ Successfully sent Slack DM to userId: ${userId}`);
    return true;
  } catch (err) {
    console.error(`❌ Error sending Slack message to ${userId}:`, err);
    return false;
  }
}

// Update matching logic for multi-location
// Match History is now filtered by location in db.js (getMatchHistory)
function haveRecentlyMatched(person1Id, person2Id, locationMatchHistory, rounds = 3) {
  // locationMatchHistory should already be filtered for the specific location
  const recentMatches = locationMatchHistory.slice(-rounds); 
  
  return recentMatches.some(matchRound => 
    matchRound.matches.some(match => 
      (match.users.includes(person1Id) && match.users.includes(person2Id))
    )
  );
}

// Matches participants *within* a specific location
function findMatchesForLocation(registrationsForLocation, locationMatchHistory, location) {
  console.log(`🔍 Finding matches for location: ${location} with ${registrationsForLocation.length} participants.`);
  const matches = [];
  const available = [...registrationsForLocation]; 
  
  available.sort((a, b) => a.availableDays.length - b.availableDays.length);
  
  while (available.length >= 2) {
    const person1 = available.shift();
    
    const potentialMatches = available.filter(p => 
      p.availableDays.some(day => person1.availableDays.includes(day)) &&
      !haveRecentlyMatched(person1.userId, p.userId, locationMatchHistory) // Use location-specific history
    );
    
    if (potentialMatches.length > 0) {
      const randomIndex = Math.floor(Math.random() * potentialMatches.length);
      const person2 = potentialMatches[randomIndex];
      
      const commonDays = person1.availableDays.filter(day => 
        person2.availableDays.includes(day)
      );
      
      matches.push({
        users: [person1.userId, person2.userId],
        commonDays: commonDays,
        location: location, // Add location to the match object
        createdAt: new Date().toISOString(),
        // id is no longer needed if we use matchId in the parent round
      });
      
      available.splice(available.indexOf(person2), 1);
    }
  }
  console.log(`✅ Found ${matches.length} matches for location: ${location}.`);
  return matches;
}

// Calculate the next Friday that's 3 weeks from now
async function getNextMatchDate() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 5 = Friday
  const daysUntilFriday = (5 - currentDay + 7) % 7; // Days until next Friday
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  
  // Get the last match date from the database
  const lastMatchDate = await getLastMatchDate();
  
  // If today is Friday, check if we should run matches today
  if (daysUntilFriday === 0) {
    // If it's Friday and we haven't run matches this week, run them
    if (!lastMatchDate || (now - lastMatchDate) >= 7 * 24 * 60 * 60 * 1000) {
      return now;
    }
  }
  
  // Add 3 weeks to get the next match date
  nextFriday.setDate(nextFriday.getDate() + 21);
  return nextFriday;
}

// Check if it's time to run matches
async function checkAndRunMatches() {
  const now = new Date();
  const lastMatchDate = await getLastMatchDate();
  const nextMatchDate = await getNextMatchDate();
  
  // If we haven't run matches yet or it's time for the next match
  if (!lastMatchDate || now >= nextMatchDate) {
    console.log('⏰ Running scheduled matches...');
    await performMatching();
    await setLastMatchDate(new Date());
    console.log(`✅ Matches completed. Next match scheduled for ${(await getNextMatchDate()).toLocaleString()}`);
  }
}

// Updated matching process for multi-location
async function performMatching() {
  console.log('🚀 Starting matching process...');
  let allNewMatches = [];
  try {
    const locations = await getAllLocations();
    if (locations.length === 0) {
        console.log('⚠️ No locations configured. Skipping matching.');
        return [];
    }

    console.log(`🏢 Processing matching for locations: ${locations.join(', ')}`);

    for (const location of locations) {
      console.log(`---
🔄 Processing location: ${location}
---`);
      const registrationsForLocation = await getAllRegistrations(location);
      
      if (registrationsForLocation.length < 2) {
        console.log(`🤷 Less than 2 participants registered for ${location}. Skipping.`);
        continue;
      }
      
      // Get match history specifically for this location
      const locationMatchHistory = await getMatchHistory(location); 
      
      const newMatchesForLocation = findMatchesForLocation(registrationsForLocation, locationMatchHistory, location);
      
      if (newMatchesForLocation.length > 0) {
          allNewMatches = allNewMatches.concat(newMatchesForLocation);
          
          // Save matches for this location (db function expects array of match objects)
          await saveMatchHistory(newMatchesForLocation); 
          console.log(`💾 Saved ${newMatchesForLocation.length} new matches for ${location}`);

          // --- Send Slack Notifications ---
          for (const match of newMatchesForLocation) {
              const person1 = registrationsForLocation.find(r => r.userId === match.users[0]);
              const person2 = registrationsForLocation.find(r => r.userId === match.users[1]);

              if (!person1 || !person2) {
                  console.error(`❌ Could not find participant details for match in ${location}:`, match);
                  continue;
              }

              // Get Slack IDs
              const slackUserId1 = await getSlackUserIdByEmail(person1.email);
              const slackUserId2 = await getSlackUserIdByEmail(person2.email);

              // Construct messages
              const message1 = `🎉 You've been matched for lunch in ${location} with ${person2.name}!
` +
                  `Common available days: ${match.commonDays.join(", ")}
` +
                  `Email: ${person2.email}
` +
                  `Reach out to schedule your lunch! 🍽️`;

              const message2 = `🎉 You've been matched for lunch in ${location} with ${person1.name}!
` +
                  `Common available days: ${match.commonDays.join(", ")}
` +
                  `Email: ${person1.email}
` +
                  `Reach out to schedule your lunch! 🍽️`;

              // Send DMs
              if (TEST_MODE) {
                  console.log(`[Test Mode] Would send DM to ${person1.email} (Slack ID: ${slackUserId1}):
${message1}`);
                  console.log(`[Test Mode] Would send DM to ${person2.email} (Slack ID: ${slackUserId2}):
${message2}`);
              } else {
                  if (slackUserId1) {
                      await sendSlackDM(slackUserId1, message1);
                  } else {
                      console.warn(`⚠️ Could not find Slack ID for ${person1.email}`);
                  }
                  if (slackUserId2) {
                      await sendSlackDM(slackUserId2, message2);
                  } else {
                      console.warn(`⚠️ Could not find Slack ID for ${person2.email}`);
                  }
              }
          }
      } else {
          console.log(`🙅 No new matches found for ${location}.`);
      }
    } // End loop over locations
    
    console.log(`✅ Matching process completed. Total new matches: ${allNewMatches.length}`);
    return allNewMatches; // Return all matches made across all locations

  } catch (err) {
    console.error("❌ Error performing matching across locations:", err);
    throw err; // Rethrow to be caught by the endpoint handler
  }
}

// --- API Endpoints ---

// Location Endpoints
app.get("/api/locations", async (_req, res) => {
  try {
    const locations = await getAllLocations();
    res.json(locations);
  } catch (err) {
    console.error("❌ Failed to retrieve locations:", err);
    res.status(500).json({ error: "Failed to retrieve locations" });
  }
});

// Requires Admin privileges
app.post("/api/locations", authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "Location name is required and must be a non-empty string" });
  }
  const locationName = name.trim();

  try {
    // Check if location already exists
    const existingLocations = await getAllLocations();
    if (existingLocations.some(loc => loc.toLowerCase() === locationName.toLowerCase())) {
        return res.status(409).json({ error: `Location "${locationName}" already exists` });
    }

    const newLocation = await saveLocation(locationName);
    console.log(`✅ Admin ${req.user.email} added location: ${locationName}`);
    res.status(201).json(newLocation); 
  } catch (err) {
    console.error(`❌ Failed to add location "${locationName}":`, err);
    res.status(500).json({ error: "Failed to add location" });
  }
});

// Requires Admin privileges
app.delete("/api/locations/:name", authenticateToken, isAdmin, async (req, res) => {
  const locationName = req.params.name;
  if (!locationName) {
    return res.status(400).json({ error: "Location name parameter is required" });
  }

  try {
    await deleteLocationByName(locationName);
    console.log(`✅ Admin ${req.user.email} deleted location: ${locationName}`);
    res.status(200).json({ message: `Location "${locationName}" deleted successfully` });
  } catch (err) {
    console.error(`❌ Failed to delete location "${locationName}":`, err);
    // Handle specific error for existing registrations
    if (err.message.startsWith('Cannot delete location')) {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: `Failed to delete location "${locationName}"` });
  }
});

// Registration Endpoints (Updated)
app.post("/api/register", authenticateToken, async (req, res) => {
  const { name, email, availableDays, location } = req.body; // Add location
  
  // Validate input (includes location)
  const validationErrors = validateRegistration({ name, email, availableDays, location });
  if (validationErrors.length > 0) {
    console.log("❌ Validation errors:", validationErrors);
    return res.status(400).json({ errors: validationErrors });
  }

  // Verify location exists
  const allowedLocations = await getAllLocations();
  if (!allowedLocations.includes(location)) {
      return res.status(400).json({ errors: [`Invalid location specified: "${location}". Please choose from the available locations.`] });
  }

  try {
    console.log(`💾 Saving registration for ${email} in ${location}...`);
    const registrationData = { name, email, availableDays, location };
    const registration = await saveRegistration(registrationData, req.user.id); // Pass location

    console.log("✅ Registration successful:", registration);
    res.status(201).json(registration); // Use 201 for resource creation

    // Send Slack notification (unchanged for now)
    try {
      const adminSlackId = await getSlackUserIdByEmail(process.env.SLACK_ADMIN_EMAIL);
      if (adminSlackId) {
          await sendSlackDM(adminSlackId, `📍 New lunch signup in ${location}: ${name} (${email})`);
      } else {
          console.warn(`⚠️ Could not find Slack ID for admin ${process.env.SLACK_ADMIN_EMAIL} to send notification.`);
      }
    } catch (slackErr) {
      console.error("❗ Error sending Slack message for new registration:", slackErr);
    }

  } catch (err) {
    console.error("❌ Registration failed:", err);
    res.status(500).json({ 
      error: "Failed to process registration",
      details: err.message 
    });
  }
});

app.put("/api/registration", authenticateToken, async (req, res) => {
    const { name, email, availableDays, location } = req.body; // Add location
  
    // Validate input
    const validationErrors = validateRegistration({ name, email, availableDays, location });
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    // Verify location exists
    const allowedLocations = await getAllLocations();
    if (!allowedLocations.includes(location)) {
        return res.status(400).json({ errors: [`Invalid location specified: "${location}". Please choose from the available locations.`] });
    }

    try {
      console.log(`💾 Updating registration for ${email} in ${location}...`);
      // Ensure we don't overwrite createdAt if it exists (though saveRegistration should handle this)
      const currentReg = await getRegistrationByUserId(req.user.id);
      const registrationData = { 
          name, 
          email, 
          availableDays, 
          location, 
          createdAt: currentReg?.createdAt // Preserve original creation timestamp
      }; 
      const registration = await saveRegistration(registrationData, req.user.id); 
      console.log("✅ Registration update successful:", registration);
      res.json(registration);
    } catch (err) {
      console.error("❌ Failed to update registration:", err);
      res.status(500).json({ error: "Failed to update registration" });
    }
});

// Participants Endpoint (Updated)
app.get("/api/participants", authenticateToken, async (req, res) => {
  const { location } = req.query; // Get optional location query param
  try {
    console.log(`🔍 Fetching participants ${location ? 'for location: ' + location : 'for all locations'}`);
    const participants = await getAllRegistrations(location); // Pass location filter to db function
    res.json(participants);
  } catch (err) {
    console.error("❌ Failed to retrieve participants:", err);
    res.status(500).json({ error: "Failed to retrieve participants" });
  }
});

// My Registration Endpoint (Unchanged - returns full item including location)
app.get("/api/my-registration", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Fetching registration for user:", req.user.id);
    const registration = await getRegistrationByUserId(req.user.id);
    console.log("📝 Found registration:", registration);
    res.json(registration); // Will include 'location' if present
  } catch (err) {
    console.error("❌ Failed to retrieve registration:", err);
    res.status(500).json({ error: "Failed to retrieve registration" });
  }
});

// Delete Registration Endpoint (Unchanged)
app.delete("/api/registration", authenticateToken, async (req, res) => {
  try {
    await deleteRegistration(req.user.id);
    console.log(`🗑️ Registration deleted for user: ${req.user.id}`);
    res.json({ message: "Registration cancelled successfully" });
  } catch (err) {
    console.error("❌ Failed to cancel registration:", err);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

// Is Admin Endpoint (uses middleware now)
app.get("/api/is-admin", authenticateToken, isAdmin, (req, res) => {
  // If we reach here, the user is an admin (or in dev mode)
  res.json({ isAdmin: true });
});

// Statistics Endpoint (Updated)
app.get("/api/statistics", authenticateToken, isAdmin, async (req, res) => {
  const { location } = req.query; // Get optional location query param

  try {
    console.log(`📊 Fetching statistics ${location ? 'for location: ' + location : 'globally'}`);
    
    // Fetch registrations (filtered if location provided)
    const registrations = await getAllRegistrations(location); 
    
    if (location && registrations.length === 0) {
        // Return empty/zero stats if location exists but has no registrations
        const locations = await getAllLocations();
        if (locations.includes(location)) {
             return res.json({
                totalRegistrations: 0,
                registrationsByDay: weekdays.reduce((acc, day) => { acc[day] = 0; return acc; }, {}),
                mostPopularDays: [],
                averageDaysPerRegistration: 0,
                recentRegistrations: 0,
                location: location,
                lastUpdated: new Date().toISOString()
             });
        } else {
            return res.status(404).json({ error: `Location "${location}" not found.` });
        }
    }

    // Calculate stats based on (potentially filtered) registrations
    const totalRegistrations = registrations.length;
    
    const registrationsByDay = weekdays.reduce((acc, day) => {
      acc[day] = registrations.filter(reg => reg.availableDays.includes(day)).length;
      return acc;
    }, {});
    
    const mostPopularDays = Object.entries(registrationsByDay)
      .sort(([, a], [, b]) => b - a)
      .filter(([, count]) => count > 0) // Only include days with > 0 registrations
      .slice(0, 3)
      .map(([day]) => day);
    
    const totalDays = registrations.reduce((sum, reg) => sum + reg.availableDays.length, 0);
    const averageDaysPerRegistration = totalRegistrations > 0 
      ? (totalDays / totalRegistrations).toFixed(1) 
      : 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentRegistrations = registrations.filter(reg => 
        reg.createdAt && new Date(reg.createdAt) > oneWeekAgo // Check if createdAt exists
    ).length;
    
    const statistics = {
      totalRegistrations,
      registrationsByDay,
      mostPopularDays,
      averageDaysPerRegistration,
      recentRegistrations,
      location: location || 'Global', // Indicate if stats are global or for a specific location
      lastUpdated: new Date().toISOString()
    };
    
    console.log("📊 Statistics calculated:", statistics);
    res.json(statistics);
  } catch (err) {
    console.error("❌ Failed to calculate statistics:", err);
    res.status(500).json({ error: "Failed to calculate statistics" });
  }
});

// Match History Endpoint (Updated)
app.get("/api/match-history", authenticateToken, isAdmin, async (req, res) => {
  const { location } = req.query; // Get optional location query param
  try {
    console.log(`📜 Fetching match history ${location ? 'for location: ' + location : 'for all locations'}`);
    
    // db.getMatchHistory now handles filtering and sorting
    const history = await getMatchHistory(location); 
    
    console.log(`📜 Found ${history.length} match rounds ${location ? 'for ' + location : 'globally'}`);
    res.json(history);
  } catch (err) {
    console.error("❌ Error reading match history:", err);
    res.status(500).json({ error: "Failed to retrieve match history" });
  }
});

// Test Matching Endpoint (Updated)
// Triggers matching for all locations immediately
app.post("/api/match", authenticateToken, isAdmin, async (req, res) => {
  console.log(`⚡ Admin ${req.user.email} triggered manual matching.`);
  try {
    // performMatching now handles multi-location logic
    const matches = await performMatching(); 
    res.json(matches); // Returns array of all matches made across locations
  } catch (err) {
    console.error("❌ Failed to perform manual matching:", err);
    res.status(500).json({ error: "Failed to perform manual matching" });
  }
});

// Test Data Generation (Updated)
async function generateTestData() {
  try {
    console.log("🔧 Generating test data for Raleigh and Boston...");
    const locations = ["Raleigh", "Boston"];
    
    // Ensure locations exist
    for (const loc of locations) {
        try {
            await saveLocation(loc);
            console.log(`  Ensured location exists: ${loc}`);
        } catch (err) {
            // Ignore error if location already exists, log others
             if (!err.message || !err.message.includes('already exists')) { // Rough check
                 console.error(`  Error ensuring location ${loc}:`, err.message);
             }
        }
    }

    const testRegistrations = [
      // Raleigh
      { name: "Alice (Raleigh)", email: "alice@example.com", availableDays: ["Monday", "Wednesday"], location: "Raleigh", userId: "test_alice" },
      { name: "Bob (Raleigh)", email: "bob@example.com", availableDays: ["Wednesday", "Friday"], location: "Raleigh", userId: "test_bob" },
      { name: "Charlie (Raleigh)", email: "charlie@example.com", availableDays: ["Monday", "Friday"], location: "Raleigh", userId: "test_charlie" },
      // Boston
      { name: "David (Boston)", email: "david@example.com", availableDays: ["Tuesday", "Thursday"], location: "Boston", userId: "test_david" },
      { name: "Eve (Boston)", email: "eve@example.com", availableDays: ["Tuesday", "Wednesday"], location: "Boston", userId: "test_eve" },
      { name: "Frank (Boston)", email: "frank@example.com", availableDays: ["Thursday", "Friday"], location: "Boston", userId: "test_frank" }
    ];

    // Clear existing test users first (optional, but good for clean slate)
    console.log("🗑️ Clearing previous test registrations (if any)...");
    for (const reg of testRegistrations) {
        try { await deleteRegistration(reg.userId); } catch (e) { /* ignore */ }
    }
    // It might also be good to clear test match history, but skipping for now

    console.log("💾 Saving new test registrations...");
    const savedRegistrations = [];
    for (const regData of testRegistrations) {
      // Use saveRegistration which handles userId as key and adds timestamps
      const saved = await saveRegistration(regData, regData.userId); 
      savedRegistrations.push(saved);
    }
    
    console.log(`✅ ${savedRegistrations.length} Test registrations generated successfully.`);
    return savedRegistrations;
  } catch (err) {
    console.error("❌ Failed to generate test data:", err);
    throw err;
  }
}

// Test Data Endpoint (Uses updated generateTestData)
app.post("/api/generate-test-data", authenticateToken, isAdmin, async (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    console.log('❌ Test data generation attempted in non-development mode by', req.user.email);
    return res.status(403).json({ error: "Test data generation is only allowed in development mode" });
  }
  
  console.log(`🔧 Admin ${req.user.email} triggered test data generation.`);
  try {
    const registrations = await generateTestData();
    res.json({ registrations });
  } catch (err) {
    console.error("❌ Failed to generate test data via endpoint:", err);
    res.status(500).json({ error: "Failed to generate test data" });
  }
});

// Schedule matches to run every day at 9 AM
const schedule = require('node-schedule');
schedule.scheduleJob('0 9 * * *', scheduling.checkAndRunMatches);

// Run an initial check on startup
scheduling.checkAndRunMatches();

// Feedback endpoint
app.post('/api/feedback', authenticateToken, async (req, res) => {
  const { feedback } = req.body;
  const user = req.user;

  if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
    return res.status(400).json({ error: 'Feedback text is required' });
  }

  try {
    // Get admin Slack ID
    const adminSlackId = await getSlackUserIdByEmail(process.env.SLACK_ADMIN_EMAIL);
    if (!adminSlackId) {
      console.error('❌ Could not find Slack ID for admin email');
      return res.status(500).json({ error: 'Failed to send feedback' });
    }

    // Construct feedback message
    const message = `📝 New feedback from ${user.name} (${user.email}):
    
${feedback}`;

    // Send feedback via Slack
    if (process.env.NODE_ENV === 'development') {
      console.log('[Test Mode] Would send feedback to admin:', message);
      return res.json({ message: 'Feedback received (test mode)' });
    }

    const sent = await sendSlackDM(adminSlackId, message);
    if (!sent) {
      throw new Error('Failed to send feedback via Slack');
    }

    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('❌ Error processing feedback:', err);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

// Admin Registration Cancellation Endpoint
app.delete("/api/admin/registration/:userId", authenticateToken, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // First get the registration to notify the admin
    const registration = await getRegistrationByUserId(userId);
    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Delete the registration
    await deleteRegistration(userId);
    console.log(`✅ Admin cancelled registration for user ${userId}`);

    // Send Slack notification
    try {
      const adminSlackId = await getSlackUserIdByEmail(process.env.SLACK_ADMIN_EMAIL);
      if (adminSlackId) {
        await sendSlackDM(adminSlackId, `❌ Admin cancelled registration for ${registration.name} (${registration.email}) in ${registration.location}`);
      }
    } catch (slackErr) {
      console.error("❗ Error sending Slack message for registration cancellation:", slackErr);
    }

    res.status(200).json({ message: "Registration cancelled successfully" });
  } catch (err) {
    console.error("❌ Failed to cancel registration:", err);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(` M Mode: ${process.env.NODE_ENV}`);
  console.log(` F Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(` B Backend URL: ${process.env.BACKEND_URL}`);
  // Log DynamoDB table names being used
  console.log(` D DynamoDB Tables:`);
  const { registrationsTable, matchHistoryTable, locationsTable } = require('./dynamodb');
  console.log(`    -> Registrations: ${registrationsTable}`);
  console.log(`    -> Match History: ${matchHistoryTable}`);
  console.log(`    -> Locations: ${locationsTable}`);
  console.log(` A Admin Emails: ${adminEmails.join(', ') || 'None configured (dev mode only)'}`);
});

// Basic error handling (optional)
app.use((err, req, res, next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).send('Something broke!');
});

// Catch-all for undefined routes (optional)
app.use((req, res) => {
  res.status(404).send("Sorry, can't find that!");
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});
