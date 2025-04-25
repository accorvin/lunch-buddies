require('dotenv').config();
const path = require("path");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const express = require("express");
const bodyParser = require("body-parser");
const { 
  saveRegistration, 
  getRegistrationByUserId, 
  getAllRegistrations, 
  deleteRegistration,
  saveMatchHistory,
  getMatchHistory
} = require('./db');

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email']
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
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    console.log('✅ Google authentication callback successful');
    console.log('👤 Authenticated user:', req.user);
    
    // Create JWT token
    const token = jwt.sign({
      id: req.user.id,
      name: req.user.displayName,
      email: req.user.emails?.[0]?.value,
      picture: req.user.photos?.[0]?.value
    }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    // Redirect to frontend with token
    const frontendUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:3000');
    frontendUrl.searchParams.set('token', token);
    
    // Log the redirect URL
    console.log('🔄 Redirecting to:', frontendUrl.toString());
    console.log('🎟️ Token:', token);
    
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

// Get admin emails from environment variable, split by comma and trim whitespace
const adminEmails = process.env.ADMIN_EMAILS ? 
  process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : 
  [];

// Set NODE_ENV to development if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('⚠️  NODE_ENV not set, defaulting to development mode');
}

// File lock for concurrent write operations
let isWriting = false;
const writeQueue = [];

function validateRegistration(reg) {
  const errors = [];
  
  if (!reg.name || typeof reg.name !== 'string' || reg.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (!reg.email || typeof reg.email !== 'string' || !reg.email.includes('@')) {
    errors.push('Valid email is required');
  }
  
  if (!Array.isArray(reg.availableDays) || reg.availableDays.length === 0) {
    errors.push('Available days must be a non-empty array');
  }
  
  return errors;
}

async function processWriteQueue() {
  if (writeQueue.length === 0) {
    isWriting = false;
    return;
  }
  
  const nextWrite = writeQueue.shift();
  try {
    await nextWrite();
  } catch (err) {
    console.error('❌ Error processing write queue:', err);
  }
  
  // Process next item in queue
  await processWriteQueue();
}

async function isDuplicate(email) {
  try {
    const all = await getAllRegistrations();
    
    // Validate data structure
    if (!Array.isArray(all)) {
      console.error("❌ Corrupted data file while checking duplicates");
      return false;
    }
    
    return all.some(p => p.email?.toLowerCase() === email.toLowerCase());
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, not a duplicate
      return false;
    }
    console.error("❌ Error checking for duplicate registration:", err);
    throw err;
  }
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
      console.error("❌ Failed to lookup Slack user by email:", data.error);
      return null;
    }

    return data.user.id;
  } catch (err) {
    console.error("❌ Error looking up Slack user ID:", err);
    return null;
  }
}

async function sendSlackDM(userId, message) {
  try {
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
      console.error("❌ Failed to send Slack message:", data.error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("❌ Error sending Slack message:", err);
    return false;
  }
}

function haveRecentlyMatched(person1Id, person2Id, matchHistory, rounds = 3) {
  // Get matches from most recent to oldest
  const recentMatches = matchHistory.slice(-rounds);
  
  return recentMatches.some(matchRound => 
    matchRound.matches.some(match => 
      (match.users.includes(person1Id) && match.users.includes(person2Id))
    )
  );
}

// Matching algorithm
function findMatches(registrations, matchHistory) {
  const matches = [];
  const available = [...registrations];
  
  // Sort by number of available days to match people with fewer options first
  available.sort((a, b) => a.availableDays.length - b.availableDays.length);
  
  while (available.length >= 2) {
    const person1 = available.shift();
    
    // Find all potential matches for person1
    const potentialMatches = available.filter(p => 
      // Must have common available days
      p.availableDays.some(day => person1.availableDays.includes(day)) &&
      // Must not have been matched recently
      !haveRecentlyMatched(person1.userId, p.userId, matchHistory)
    );
    
    if (potentialMatches.length > 0) {
      // If multiple potential matches exist, choose one randomly
      const randomIndex = Math.floor(Math.random() * potentialMatches.length);
      const person2 = potentialMatches[randomIndex];
      
      // Find all common days between the matched pair
      const commonDays = person1.availableDays.filter(day => 
        person2.availableDays.includes(day)
      );
      
      matches.push({
        users: [person1.userId, person2.userId],
        commonDays: commonDays,
        createdAt: new Date().toISOString(),
        id: Date.now().toString()
      });
      
      // Remove person2 from available pool
      available.splice(available.indexOf(person2), 1);
    }
  }
  
  return matches;
}

// Schedule matching
let lastMatchDate = null;

async function scheduleMatches() {
  if (!lastMatchDate || 
      (new Date() - lastMatchDate) >= MATCHING_INTERVAL_DAYS * 24 * 60 * 60 * 1000) {
    await performMatching();
    lastMatchDate = new Date();
  }
}

async function performMatching() {
  try {
    // Read and validate registrations file
    let registrations = [];
    try {
      registrations = await getAllRegistrations();
      
      // Validate data structure
      if (!Array.isArray(registrations)) {
        console.error("❌ Invalid registrations data - resetting to empty array");
        registrations = [];
        await saveMatchHistory([]);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        registrations = [];
        await saveMatchHistory([]);
      } else {
        console.error("❌ Error reading registrations:", err);
        throw err;
      }
    }
    
    // Get match history
    const matchHistory = await getMatchHistory();
    
    // Find new matches
    const newMatches = findMatches(registrations, matchHistory);
    
    if (newMatches.length > 0) {
      // Add new matches to history
      const newMatchRound = {
        date: new Date().toISOString(),
        matches: newMatches
      };
      
      // Add to history and save
      await saveMatchHistory([...matchHistory, newMatchRound]);
      console.log(`✅ Saved ${newMatches.length} new matches`);
    }
    
    // Send notifications for new matches
    for (const match of newMatches) {
      const person1 = registrations.find(r => r.userId === match.users[0]);
      const person2 = registrations.find(r => r.userId === match.users[1]);
      
      if (!person1 || !person2) {
        console.error('❌ Could not find participants for match:', match);
        continue;
      }
      
      const message = `🎉 You've been matched for lunch with ${person2.name}!\n` +
        `Common available days: ${match.commonDays.join(", ")}\n` +
        `Email: ${person2.email}`;
      
      if (TEST_MODE) {
        console.log(`Test mode - would send DM to ${person1.email}`);
      } else {
        const userId = await getSlackUserIdByEmail(person1.email);
        if (userId) {
          await sendSlackDM(userId, message);
        }
      }
      
      // Send the same message to person2
      const message2 = `🎉 You've been matched for lunch with ${person1.name}!\n` +
        `Common available days: ${match.commonDays.join(", ")}\n` +
        `Email: ${person1.email}`;
      
      if (TEST_MODE) {
        console.log(`Test mode - would send DM to ${person2.email}`);
      } else {
        const userId2 = await getSlackUserIdByEmail(person2.email);
        if (userId2) {
          await sendSlackDM(userId2, message2);
        }
      }
    }
    
    return newMatches;
  } catch (err) {
    console.error("❌ Error performing matching:", err);
    throw err;
  }
}

// Add test matching endpoint
app.post("/api/match", authenticateToken, async (req, res) => {
  try {
    const matches = await performMatching();
    res.json(matches);
  } catch (err) {
    console.error("❌ Failed to perform matching:", err);
    res.status(500).json({ error: "Failed to perform matching" });
  }
});

// Schedule regular matching
setInterval(scheduleMatches, 60 * 60 * 1000); // Check every hour
scheduleMatches(); // Run immediately on startup

app.post("/api/register", authenticateToken, async (req, res) => {
  console.log("📝 Registration request received:", {
    user: req.user,
    body: req.body,
    headers: req.headers
  });

  const { name, email, availableDays } = req.body;
  
  // Validate input
  const validationErrors = validateRegistration({ name, email, availableDays });
  if (validationErrors.length > 0) {
    console.log("❌ Validation errors:", validationErrors);
    return res.status(400).json({ errors: validationErrors });
  }

  try {
    console.log("💾 Saving registration...");
    const registration = await saveRegistration(
      { name, email, availableDays },
      req.user.id
    );

    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');

    // Send the response immediately
    console.log("✅ Registration successful:", registration);
    res.status(200).json(registration);

    // Send Slack notification after sending the response
    try {
      console.log("📨 Sending Slack notification...");
      const userId = await getSlackUserIdByEmail(process.env.SLACK_ADMIN_EMAIL);
      const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          channel: userId,
          text: `New lunch signup: ${name} (${email})`
        })
      });

      if (!slackRes.ok) {
        console.error("❌ Failed to send Slack notification:", await slackRes.text());
      } else {
        console.log("✅ Slack notification sent successfully");
      }
    } catch (err) {
      console.error("❗ Error sending Slack message:", err);
      // Don't fail the registration if Slack notification fails
    }
  } catch (err) {
    console.error("❌ Registration failed:", err);
    res.status(500).json({ 
      error: "Failed to process registration",
      details: err.message 
    });
  }
});

app.get("/api/participants", authenticateToken, async (_req, res) => {
  try {
    const participants = await getAllRegistrations();
    res.json(participants);
  } catch (err) {
    console.error("❌ Failed to retrieve participants:", err);
    res.status(500).json({ error: "Failed to retrieve participants" });
  }
});

app.get("/api/is-admin", authenticateToken, (req, res) => {
  const email = req.user.email;
  
  // In development mode, always return true if user is authenticated
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: granting admin access to', email);
    return res.json({ isAdmin: true });
  }
  
  const isAdmin = adminEmails.includes(email);
  console.log('Checking admin status for', email, ':', isAdmin);
  res.json({ isAdmin });
});

app.get("/api/my-registration", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Fetching registration for user:", req.user.id);
    const registration = await getRegistrationByUserId(req.user.id);
    console.log("📝 Found registration:", registration);
    res.json(registration);
  } catch (err) {
    console.error("❌ Failed to retrieve registration:", err);
    res.status(500).json({ error: "Failed to retrieve registration" });
  }
});

app.put("/api/registration", authenticateToken, async (req, res) => {
  const { name, email, availableDays } = req.body;
  
  // Validate input
  const validationErrors = validateRegistration({ name, email, availableDays });
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }

  try {
    const registration = await saveRegistration(
      { name, email, availableDays },
      req.user.id
    );
    res.json(registration);
  } catch (err) {
    console.error("❌ Failed to update registration:", err);
    res.status(500).json({ error: "Failed to update registration" });
  }
});

app.delete("/api/registration", authenticateToken, async (req, res) => {
  try {
    await deleteRegistration(req.user.id);
    res.json({ message: "Registration cancelled successfully" });
  } catch (err) {
    console.error("❌ Failed to cancel registration:", err);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

// Add statistics endpoint
app.get("/api/statistics", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Fetching statistics for user:", req.user.id);
    const all = await getAllRegistrations();
    
    // Calculate total registrations
    const totalRegistrations = all.length;
    
    // Calculate registrations by day
    const registrationsByDay = weekdays.reduce((acc, day) => {
      acc[day] = all.filter(reg => reg.availableDays.includes(day)).length;
      return acc;
    }, {});
    
    // Calculate most popular days
    const mostPopularDays = Object.entries(registrationsByDay)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);
    
    // Calculate average days per registration
    const totalDays = all.reduce((sum, reg) => sum + reg.availableDays.length, 0);
    const averageDaysPerRegistration = totalRegistrations > 0 
      ? (totalDays / totalRegistrations).toFixed(1) 
      : 0;
    
    // Calculate registration growth (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentRegistrations = all.filter(reg => 
      new Date(reg.createdAt) > oneWeekAgo
    ).length;
    
    const statistics = {
      totalRegistrations,
      registrationsByDay,
      mostPopularDays,
      averageDaysPerRegistration,
      recentRegistrations,
      lastUpdated: new Date().toISOString()
    };
    
    console.log("📊 Statistics calculated:", statistics);
    res.json(statistics);
  } catch (err) {
    console.error("❌ Failed to calculate statistics:", err);
    res.status(500).json({ error: "Failed to calculate statistics" });
  }
});

// Add test data generation function
async function generateTestData() {
  try {
    console.log("🔧 Generating test data...");
    const testRegistrations = [
      {
        name: "Test User 1",
        email: "test1@example.com",
        availableDays: ["Monday", "Wednesday", "Friday"],
        userId: "test1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: "Test User 2",
        email: "test2@example.com",
        availableDays: ["Tuesday", "Thursday"],
        userId: "test2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        name: "Test User 3",
        email: "test3@example.com",
        availableDays: ["Monday", "Wednesday", "Thursday"],
        userId: "test3",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Save test registrations
    await saveMatchHistory(testRegistrations);
    console.log("✅ Test data generated successfully");
    return testRegistrations;
  } catch (err) {
    console.error("❌ Failed to generate test data:", err);
    throw err;
  }
}

// Add test data generation endpoint
app.post("/api/generate-test-data", authenticateToken, async (req, res) => {
  try {
    // Only allow test data generation in development mode
    if (process.env.NODE_ENV !== 'development') {
      console.log('❌ Test data generation attempted in production');
      return res.status(403).json({ error: "Test data generation is only allowed in development mode" });
    }

    const registrations = await generateTestData();
    res.json({ registrations });
  } catch (err) {
    console.error("❌ Failed to generate test data:", err);
    res.status(500).json({ error: "Failed to generate test data" });
  }
});

// Add match history endpoint
app.get("/api/match-history", authenticateToken, async (req, res) => {
  try {
    console.log("🔍 Fetching match history for user:", req.user.id);
    const history = await getMatchHistory();
    
    // Sort history by date (most recent first)
    const sortedHistory = history.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    console.log("Sending match history:", JSON.stringify(sortedHistory, null, 2));
    res.json(sortedHistory);
  } catch (err) {
    console.error("❌ Error reading match history:", err);
    res.status(500).json({ error: "Failed to retrieve match history" });
  }
});

// Initialize data files if they don't exist
async function initializeDataFiles() {
  try {
    // Initialize registrations file
    if (!await getAllRegistrations().length) {
      await saveMatchHistory([]);
      console.log(`✅ Created registrations file: ${path.join(process.cwd(), 'data', 'registrations.json')}`);
    } else {
      // Verify existing file has valid JSON
      try {
        const content = await getAllRegistrations();
        if (!content.length) {
          // File is empty
          await saveMatchHistory([]);
          console.log(`⚠️  Empty registrations file - resetting to empty array`);
        } else {
          JSON.parse(content);
        }
      } catch (err) {
        console.log(`⚠️  Invalid JSON in registrations file, resetting to empty array`);
        await saveMatchHistory([]);
      }
    }

    // Initialize match history file
    if (!await getMatchHistory().length) {
      await saveMatchHistory([]);
      console.log(`✅ Created match history file: ${path.join(process.cwd(), 'data', 'match_history.json')}`);
    } else {
      // Verify existing file has valid JSON
      try {
        const content = await getMatchHistory();
        if (!content.length) {
          // File is empty
          await saveMatchHistory([]);
          console.log(`⚠️  Empty match history file - resetting to empty array`);
        } else {
          JSON.parse(content);
        }
      } catch (err) {
        console.log(`⚠️  Invalid JSON in match history file, resetting to empty array`);
        await saveMatchHistory([]);
      }
    }
  } catch (err) {
    console.error("❌ Failed to initialize data files:", err);
    throw err;
  }
}

// Initialize data files before starting the server
initializeDataFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Using data directory: ${path.join(process.cwd(), 'data')}`);
  });
}).catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
