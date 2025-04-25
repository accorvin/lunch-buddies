# Backend Testing Guide

## Setup

1. Set the backend URL environment variable:
```bash
# For local testing
export BACKEND_URL=http://localhost:8080

# For App Runner testing
export BACKEND_URL=https://your-app-runner-url.awsapprunner.com
```

## Authentication Tests

### Login
```bash
# Start the login flow (will redirect to Google)
curl -v "$BACKEND_URL/auth/google"

# After Google authentication, you'll be redirected back with a session cookie
```

### Check Session
```bash
# Check if you have a valid session
curl -v "$BACKEND_URL/auth/me" \
  --cookie "connect.sid=your-session-cookie"
```

### Logout
```bash
# Logout and clear session
curl -v "$BACKEND_URL/auth/logout" \
  --cookie "connect.sid=your-session-cookie"
```

## Participant Management

### Register as Participant
```bash
# Register as a participant
curl -v "$BACKEND_URL/api/participants" \
  -X POST \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=your-session-cookie" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "availableDays": ["Monday", "Wednesday", "Friday"]
  }'
```

### Get All Participants
```bash
# Get all participants (admin only)
curl -v "$BACKEND_URL/api/participants" \
  --cookie "connect.sid=your-session-cookie"
```

### Get My Participant Info
```bash
# Get your own participant info
curl -v "$BACKEND_URL/api/participants/me" \
  --cookie "connect.sid=your-session-cookie"
```

## Match Management

### Generate Matches
```bash
# Generate new matches (admin only)
curl -v "$BACKEND_URL/api/matches/generate" \
  -X POST \
  --cookie "connect.sid=your-session-cookie"
```

### Get My Matches
```bash
# Get your current matches
curl -v "$BACKEND_URL/api/matches/me" \
  --cookie "connect.sid=your-session-cookie"
```

### Get All Matches
```bash
# Get all matches (admin only)
curl -v "$BACKEND_URL/api/matches" \
  --cookie "connect.sid=your-session-cookie"
```

## Admin Operations

### Get Statistics
```bash
# Get system statistics (admin only)
curl -v "$BACKEND_URL/api/admin/statistics" \
  --cookie "connect.sid=your-session-cookie"
```

### Get Match History
```bash
# Get match history (admin only)
curl -v "$BACKEND_URL/api/admin/history" \
  --cookie "connect.sid=your-session-cookie"
```

## Tips

1. To see detailed request/response information, use the `-v` flag with curl
2. To save cookies between requests, use the `-c` and `-b` flags:
```bash
# Save cookies to a file
curl -c cookies.txt "$BACKEND_URL/auth/google"

# Use saved cookies in subsequent requests
curl -b cookies.txt "$BACKEND_URL/api/participants/me"
```

3. For JSON responses, pipe to `jq` for pretty printing:
```bash
curl "$BACKEND_URL/api/participants" | jq
```

4. To test error cases, try:
   - Making requests without authentication
   - Using invalid session cookies
   - Sending malformed JSON data
   - Accessing admin endpoints as a regular user 