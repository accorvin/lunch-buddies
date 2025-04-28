# Development Guide

## Prerequisites
- Node.js 18.x
- Git
- Podman (for local DynamoDB)
- AWS CLI (for deployment)

## Initial Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/lunch-buddy-app.git
cd lunch-buddy-app
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

## Development Environment

### Frontend Development
1. Start the development server:
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:5173`

2. Environment variables:
Create a `.env` file in the frontend directory:
```env
VITE_BACKEND_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Backend Development
1. Start local DynamoDB:
```bash
podman run -p 8000:8000 amazon/dynamodb-local
```

2. Set up local DynamoDB tables:
```bash
cd backend
NODE_ENV=development node scripts/setup-dynamodb.js
```

This will create four tables in your local DynamoDB:
- `LunchBuddyRegistrations`: Stores user registration data
- `LunchBuddyMatchHistory`: Stores the history of lunch matches
- `LunchBuddyLocations`: Stores available office locations
- `LunchBuddyMatchSchedule`: Stores match scheduling data

3. Start the development server:
```bash
npm run dev
```
The backend will be available at `http://localhost:8080`

4. Environment variables:
Create a `.env` file in the backend directory:
```env
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SLACK_ADMIN_EMAIL=your-admin-email
SLACK_BOT_TOKEN=your-slack-bot-token
JWT_SECRET=your-secure-random-string
```

## Multi-Location Support

The Lunch Buddy app supports multiple locations for participant matching. This feature allows:

1. Location Management:
   - Site leaders can add and manage locations
   - Each location can have its own set of participants
   - Statistics are tracked per location

2. Development Considerations:
   - Test with multiple locations to ensure proper matching
   - Verify location-based filtering in statistics
   - Check location selection in registration forms

3. Testing Multi-Location Features:
   - Add test locations through the admin interface
   - Register participants at different locations
   - Verify matching logic respects location preferences
   - Test location-specific statistics

## Project Structure

```
lunch-buddy-app/
├── frontend/           # Frontend React application
│   ├── src/           # Source code
│   ├── public/        # Static assets
│   └── package.json   # Frontend dependencies
├── backend/           # Backend Node.js application
│   ├── src/          # Source code
│   ├── scripts/      # Database setup scripts
│   └── package.json  # Backend dependencies
└── docs/             # Documentation
```

## Development Workflow

1. Create a new branch for your feature:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and test locally

3. Commit your changes:
```bash
git add .
git commit -m "Description of your changes"
```

4. Push your branch:
```bash
git push origin feature/your-feature-name
```

5. Create a pull request on GitHub

## Testing

For testing instructions, see the [Testing Guide](testing.md).

## Deployment

For deployment instructions, see the [Deployment Guide](deployment.md).

## Troubleshooting

### Frontend Issues
1. If the development server won't start:
   - Check if port 5173 is available
   - Verify all dependencies are installed
   - Check for syntax errors in the code

2. If the frontend can't connect to the backend:
   - Verify the backend is running
   - Check the `VITE_BACKEND_URL` environment variable
   - Check CORS settings in the backend

### Backend Issues
1. If the server won't start:
   - Check if port 8080 is available
   - Verify all environment variables are set
   - Check for syntax errors in the code

2. If authentication isn't working:
   - Verify Google OAuth credentials
   - Check JWT configuration
   - Verify environment variables

3. If data isn't being saved:
   - Verify DynamoDB is running
   - Check DynamoDB table setup
   - Verify AWS credentials (in production) 