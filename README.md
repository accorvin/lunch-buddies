# Red Hat AI Lunch Buddy Program

[![Tests](https://github.com/accorvin/lunch-buddies/actions/workflows/tests.yml/badge.svg)](https://github.com/accorvin/lunch-buddies/actions/workflows/tests.yml)

A modern web application that connects Red Hat AI team members for lunch meetups based on common availability and location preferences.

## Features

- 🔐 Secure authentication with Google OAuth
- 📅 User registration with available days and location preferences
- 🤝 Location-based matching of lunch buddies
- 📊 Admin dashboard for managing locations and triggering matches
- 📝 Match history viewing and feedback submission
- 📱 Slack integration for notifications and admin communications
- 🌐 Multi-location support with site leader management
- 💬 Customizable per-location notification messages with template variables

## Tech Stack

- **Frontend**: React + TypeScript with PatternFly UI
- **Backend**: Node.js + Express
- **Database**: AWS DynamoDB
- **Authentication**: Google OAuth
- **Deployment**: AWS App Runner (Backend) + AWS Amplify (Frontend)
- **Containerization**: Podman/Docker
- **CI/CD**: AWS CodePipeline

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 7.x or higher
- AWS CLI (for deployment)
- Podman or Docker (for containerization)
- Git

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/lunch-buddy-app.git
cd lunch-buddy-app
```

2. Backend Setup:
```bash
# Start local DynamoDB instance
podman run -p 8000:8000 amazon/dynamodb-local

# In a new terminal:
cd backend
npm install
cp .env.example .env  # Edit with your configuration
NODE_ENV=development node scripts/setup-dynamodb.js  # Sets up local DynamoDB tables
npm run dev
```

> **Note**: For detailed database setup instructions, see [Database Setup Guide](docs/database-setup.md)

3. Frontend Setup:
```bash
cd frontend
npm install
cp .env.example .env  # Edit with your configuration
npm run dev
```

### Environment Variables

Both the frontend and backend require environment variables to be configured. Copy the respective `.env.example` files to `.env` and update the values as needed:

- Backend: `backend/.env.example`
- Frontend: `frontend/.env.example`

The example files contain all required variables with descriptions and example values. Make sure to set up all required variables before starting the application.

## Testing

Run the test suites:

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

For more details, see [TESTING.md](TESTING.md).

## Deployment

The application is designed to be deployed on AWS using App Runner for the backend and Amplify for the frontend. For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Quick Deployment Overview

1. **Database Setup**:
   - Configure DynamoDB tables using the setup script
   - Set up proper IAM roles and permissions

2. **Backend Deployment**:
   - Build and push container image to ECR
   - Deploy to AWS App Runner
   - Configure environment variables

3. **Frontend Deployment**:
   - Deploy to AWS Amplify
   - Configure custom domain (optional)
   - Set up environment variables

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -am 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

Please ensure your code:
- Passes all tests
- Follows the project's coding standards
- Includes appropriate documentation
- Updates relevant documentation

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact the project maintainers or open an issue in the repository.
