# Lunch Buddy App

A web application that helps organize lunch meetings between team members.

## Documentation

- [Development Guide](docs/development.md)
- [Deployment Guide](docs/deployment.md)
- [Testing Guide](docs/testing.md)
- [Database Setup Guide](docs/database-setup.md)

## Features

- Google OAuth authentication
- Participant registration and management
- Automated lunch partner matching
- Admin dashboard for match management
- Slack integration for notifications

## Tech Stack

### Frontend
- React
- TypeScript
- PatternFly
- Vite

### Backend
- Node.js
- Express
- DynamoDB (AWS)
- Google OAuth
- Slack API

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd backend
   npm install
   ```

3. Set up environment variables (see development guide)
4. Set up local database (see database setup guide)
5. Start the development servers:
   ```bash
   # Frontend
   cd frontend
   npm run dev

   # Backend
   cd backend
   npm run dev
   ```

## License

MIT
