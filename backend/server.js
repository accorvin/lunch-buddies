require('dotenv').config();
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Required environment variables
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_ADMIN_EMAIL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
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

// Data storage configuration
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const REGISTRATIONS_FILE = 'registrations.json';
const MATCH_HISTORY_FILE = 'match_history.json';
const dataPath = path.join(DATA_DIR, REGISTRATIONS_FILE);
const matchHistoryPath = path.join(DATA_DIR, MATCH_HISTORY_FILE);

// Ensure data directory exists
try {
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`✅ Created data directory: ${DATA_DIR}`);
  }
} catch (err) {
  console.error(`❌ Failed to create data directory ${DATA_DIR}:`, err);
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8080;

// Add cookie-parser middleware before session middleware
app.use(cookieParser());

// CORS configuration - must be before other middleware
const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'x-user-email',
    'Cache-Control',
    'Accept',
    'Origin',
    'Sec-Fetch-Site',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Dest'
  ],
  exposedHeaders: ['Set-Cookie']
};

console.log('⚙️ CORS configuration:', corsConfig);
app.use(cors(corsConfig));

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
console.log('⚙️ Environment:', process.env.NODE_ENV);
console.log('⚙️ Frontend URL:', process.env.FRONTEND_URL);

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  proxy: true, // Trust the reverse proxy
  cookie: { 
    secure: isProduction, // Must be true in production
    sameSite: isProduction ? 'none' : 'lax', // Must be 'none' in production with secure:true
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    // Remove domain setting to allow cross-domain cookies
    domain: undefined
  },
  name: 'lunchbuddy.sid'
};

console.log('⚙️ Session configuration:', {
  ...sessionConfig,
  secret: '[HIDDEN]'
});

if (isProduction) {
  app.set('trust proxy', 1); // Trust first proxy
}

app.use(session(sessionConfig));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`\n🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('📝 Request Headers:', req.headers);
  console.log('🍪 Parsed Cookies:', req.cookies);
  console.log('🔑 Session ID:', req.sessionID);
  console.log('🔑 Session:', req.session);
  console.log('🔒 Secure context:', req.secure);
  console.log('🌍 Protocol:', req.protocol);
  console.log('🏠 Host:', req.get('host'));
  next();
});

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

passport.serializeUser((user, done) => {
  console.log('📥 Serializing user:', user.displayName);
  const userData = {
    id: user.id,
    name: user.displayName,
    email: user.emails?.[0]?.value,
    picture: user.photos?.[0]?.value
  };
  console.log('💾 Serialized user data:', userData);
  done(null, userData);
});

passport.deserializeUser((userData, done) => {
  console.log('📤 Deserializing user:', userData.name);
  done(null, userData);
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

async function saveRegistration(reg, userId) {
  return new Promise((resolve, reject) => {
    const writeOperation = async () => {
      try {
        let all = [];
        try {
          const raw = await fs.readFile(dataPath, "utf-8");
          all = JSON.parse(raw);
          
          // Validate existing data structure
          if (!Array.isArray(all)) {
            console.error("❌ Corrupted data file - resetting to empty array");
            all = [];
          }
        } catch (e) {
          if (e.code !== 'ENOENT') {
            console.error("❌ Error reading registrations file:", e);
          }
          // File doesn't exist or is corrupted, start with empty array
        }

        // Find existing registration for this user
        const existingReg = all.find(r => r.userId === userId);
        
        // Create new registration object
        const registration = {
          ...reg,
          userId,
          id: existingReg?.id || Date.now().toString(), // Preserve existing ID or create new one
          createdAt: existingReg?.createdAt || new Date().toISOString(), // Preserve creation date
          updatedAt: new Date().toISOString() // Always update the updatedAt timestamp
        };

        // Remove any existing registration for this user
        all = all.filter(r => r.userId !== userId);
        all.push(registration);

        await fs.writeFile(dataPath, JSON.stringify(all, null, 2));
        console.log("✅ Registration saved successfully");
        resolve(registration);
      } catch (err) {
        console.error("❌ Failed to save registration:", err);
        reject(err);
      }
    };

    // Add write operation to queue
    writeQueue.push(writeOperation);
    
    if (!isWriting) {
      isWriting = true;
      processWriteQueue().catch(reject);
    }
  });
}

async function isDuplicate(email) {
  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    const all = JSON.parse(raw);
    
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

async function getMatchHistory() {
  try {
    console.log("📖 Reading match history from:", matchHistoryPath);
    const raw = await fs.readFile(matchHistoryPath, "utf-8");
    console.log("Raw match history data:", raw);
    const history = JSON.parse(raw);
    console.log(`📜 Found ${history.length} match rounds in history`);
    console.log("Match history data:", JSON.stringify(history, null, 2));
    return Array.isArray(history) ? history : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log("⚠️  Match history file not found - starting with empty array");
      return [];
    }
    console.error("❌ Error reading match history:", err);
    throw err;
  }
}

async function saveMatchHistory(matches) {
  try {
    console.log("💾 Writing match history to file...");
    console.log("Match history data:", JSON.stringify(matches, null, 2));
    await fs.writeFile(matchHistoryPath, JSON.stringify(matches, null, 2));
    console.log("✅ Match history saved successfully");
  } catch (err) {
    console.error("❌ Error saving match history:", err);
    throw err;
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
      const raw = await fs.readFile(dataPath, "utf-8");
      registrations = JSON.parse(raw);
      
      // Validate data structure
      if (!Array.isArray(registrations)) {
        console.error("❌ Invalid registrations data - resetting to empty array");
        registrations = [];
        await fs.writeFile(dataPath, JSON.stringify(registrations, null, 2));
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        registrations = [];
        await fs.writeFile(dataPath, JSON.stringify(registrations, null, 2));
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
      matchHistory.push(newMatchRound);
      await saveMatchHistory(matchHistory);
      console.log(`✅ Saved ${newMatches.length} new matches`);
    }
    
    // Send notifications for new matches
    for (const match of newMatches) {
      const person1 = registrations.find(r => r.users[0] === r.users[0]);
      const person2 = registrations.find(r => r.users[1] === r.users[1]);
      
      if (!person1 || !person2) continue;
      
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
app.post("/api/match", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

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

app.post("/api/register", async (req, res) => {
  console.log("📝 Registration request received:", {
    authenticated: req.isAuthenticated(),
    body: req.body,
    headers: req.headers,
    session: req.session
  });

  if (!req.isAuthenticated()) {
    console.log("❌ Not authenticated");
    return res.status(401).json({ error: "Not authenticated" });
  }

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

    // Ensure the registration has all required fields
    if (!registration.id || !registration.userId) {
      console.error("❌ Invalid registration data:", registration);
      throw new Error("Invalid registration data");
    }

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

app.get("/api/participants", async (_req, res) => {
  try {
    let participants = [];
    try {
      const raw = await fs.readFile(dataPath, "utf-8");
      participants = JSON.parse(raw);
      
      // Validate data structure
      if (!Array.isArray(participants)) {
        console.error("❌ Corrupted data file when reading participants");
        participants = [];
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error("❌ Error reading participants:", err);
      }
      // Return empty array for new file or errors
    }
    res.json(participants);
  } catch (err) {
    console.error("❌ Failed to retrieve participants:", err);
    res.status(500).json({ error: "Failed to retrieve participants" });
  }
});

app.get("/api/is-admin", (req, res) => {
  const email = req.headers["x-user-email"];
  
  // In development mode, always return true if user is authenticated
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: granting admin access to', email);
    return res.json({ isAdmin: true });
  }
  
  const isAdmin = adminEmails.includes(email);
  console.log('Checking admin status for', email, ':', isAdmin);
  res.json({ isAdmin });
});

// Authentication routes
app.get('/auth/google',
  (req, res, next) => {
    console.log('🔑 Received Google auth request');
    console.log('📝 Auth Headers:', req.headers);
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  (req, res, next) => {
    console.log('🔄 Received Google auth callback');
    console.log('📝 Callback Headers:', req.headers);
    console.log('🔑 Session before auth:', req.session);
    next();
  },
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('✅ Google authentication callback successful');
    console.log('👤 Authenticated user:', req.user);
    console.log('🔑 Session after auth:', req.session);
    
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error saving session:', err);
      } else {
        console.log('✅ Session saved successfully');
      }
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
    });
  }
);

app.get('/auth/current-user', (req, res) => {
  console.log('👥 Current user request received');
  console.log('🔑 Session:', req.session);
  console.log('👤 User:', req.user);
  console.log('🔒 isAuthenticated:', req.isAuthenticated());
  
  if (!req.isAuthenticated()) {
    console.log('❌ User not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  console.log('✅ Returning user data:', req.user);
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    picture: req.user.picture
  });
});

app.post('/auth/logout', (req, res) => {
  console.log('🚪 Logout request received');
  console.log('👤 Current user:', req.user);
  console.log('🔑 Session before logout:', req.session);
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Error during logout:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    console.log('✅ User logged out successfully');
    console.log('🔑 Session after logout:', req.session);
    res.json({ message: 'Logged out successfully' });
  });
});

app.get("/api/my-registration", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    const all = JSON.parse(raw);
    const myRegistration = all.find(r => r.userId === req.user.id);
    res.json(myRegistration || null);
  } catch (err) {
    console.error("❌ Failed to retrieve registration:", err);
    res.status(500).json({ error: "Failed to retrieve registration" });
  }
});

app.put("/api/registration", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

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

app.delete("/api/registration", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    let all = [];
    try {
      const raw = await fs.readFile(dataPath, "utf-8");
      all = JSON.parse(raw);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error("❌ Error reading registrations file:", e);
      }
    }

    // Remove the user's registration
    all = all.filter(r => r.userId !== req.user.id);
    await fs.writeFile(dataPath, JSON.stringify(all, null, 2));
    
    res.json({ message: "Registration cancelled successfully" });
  } catch (err) {
    console.error("❌ Failed to cancel registration:", err);
    res.status(500).json({ error: "Failed to cancel registration" });
  }
});

// Add statistics endpoint
app.get("/api/statistics", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    const all = JSON.parse(raw);
    
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
    
    res.json(statistics);
  } catch (err) {
    console.error("❌ Failed to calculate statistics:", err);
    res.status(500).json({ error: "Failed to calculate statistics" });
  }
});

// Add test data generation endpoint
app.post("/api/generate-test-data", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Read existing registrations
    let existingRegistrations = [];
    try {
      const raw = await fs.readFile(dataPath, "utf-8");
      existingRegistrations = JSON.parse(raw);
      
      // Validate data structure
      if (!Array.isArray(existingRegistrations)) {
        console.error("❌ Corrupted data file - resetting to empty array");
        existingRegistrations = [];
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error("❌ Error reading registrations file:", e);
      }
      // File doesn't exist or is corrupted, start with empty array
    }

    const testRegistrations = [
      {
        id: "test-1",
        name: "Test User 1",
        email: "test1@example.com",
        availableDays: ["Monday", "Wednesday", "Friday"],
        userId: "test-user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "test-2",
        name: "Test User 2",
        email: "test2@example.com",
        availableDays: ["Tuesday", "Wednesday", "Thursday"],
        userId: "test-user-2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "test-3",
        name: "Test User 3",
        email: "test3@example.com",
        availableDays: ["Monday", "Wednesday", "Thursday"],
        userId: "test-user-3",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Add test registrations to existing data
    const updatedRegistrations = [...existingRegistrations, ...testRegistrations];
    
    // Save the updated registrations
    await fs.writeFile(dataPath, JSON.stringify(updatedRegistrations, null, 2));

    console.log("✅ Test data generated successfully");
    res.json({ message: "Test data generated successfully", registrations: testRegistrations });
  } catch (error) {
    console.error("❌ Error generating test data:", error);
    res.status(500).json({ error: "Failed to generate test data" });
  }
});

// Add match history endpoint
app.get("/api/match-history", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log("🔍 Fetching match history...");
    const raw = await fs.readFile(matchHistoryPath, "utf-8");
    console.log("Raw match history data:", raw);
    const history = JSON.parse(raw);
    
    // Validate data structure
    if (!Array.isArray(history)) {
      console.error("❌ Corrupted match history file");
      return res.status(500).json({ error: "Invalid match history data" });
    }
    
    // Sort history by date (most recent first)
    const sortedHistory = history.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    console.log("Sending match history:", JSON.stringify(sortedHistory, null, 2));
    res.json(sortedHistory);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, return empty array
      console.log("⚠️  Match history file not found - returning empty array");
      return res.json([]);
    }
    console.error("❌ Error reading match history:", err);
    res.status(500).json({ error: "Failed to retrieve match history" });
  }
});

// Initialize data files if they don't exist
async function initializeDataFiles() {
  try {
    // Initialize registrations file
    if (!fsSync.existsSync(dataPath)) {
      await fs.writeFile(dataPath, JSON.stringify([], null, 2));
      console.log(`✅ Created registrations file: ${dataPath}`);
    } else {
      // Verify existing file has valid JSON
      try {
        const content = await fs.readFile(dataPath, 'utf-8');
        if (!content.trim()) {
          // File is empty
          await fs.writeFile(dataPath, JSON.stringify([], null, 2));
          console.log(`⚠️  Empty registrations file - resetting to empty array`);
        } else {
          JSON.parse(content);
        }
      } catch (err) {
        console.log(`⚠️  Invalid JSON in registrations file, resetting to empty array`);
        await fs.writeFile(dataPath, JSON.stringify([], null, 2));
      }
    }

    // Initialize match history file
    if (!fsSync.existsSync(matchHistoryPath)) {
      await fs.writeFile(matchHistoryPath, JSON.stringify([], null, 2));
      console.log(`✅ Created match history file: ${matchHistoryPath}`);
    } else {
      // Verify existing file has valid JSON
      try {
        const content = await fs.readFile(matchHistoryPath, 'utf-8');
        if (!content.trim()) {
          // File is empty
          await fs.writeFile(matchHistoryPath, JSON.stringify([], null, 2));
          console.log(`⚠️  Empty match history file - resetting to empty array`);
        } else {
          JSON.parse(content);
        }
      } catch (err) {
        console.log(`⚠️  Invalid JSON in match history file, resetting to empty array`);
        await fs.writeFile(matchHistoryPath, JSON.stringify([], null, 2));
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
    console.log(`📁 Using data directory: ${DATA_DIR}`);
  });
}).catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
