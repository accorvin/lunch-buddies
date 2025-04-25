# Red Hat AI Lunch Buddy Program

This application connects Red Hat AI team members for lunch meetups based on common availability and location.

## Features

- User registration with available days and location
- Location-based matching of lunch buddies
- Admin dashboard for managing locations and triggering matches
- Match history viewing
- User feedback submission

## Repository Structure

- `backend/`: Node.js Express backend with DynamoDB integration
- `frontend/`: React TypeScript frontend with PatternFly UI
- `docs/`: Documentation files
- `k8s/`: Kubernetes deployment configurations

## Development

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- AWS account for DynamoDB (or local DynamoDB)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Edit .env with your configuration
npm run setup-local-db  # Sets up local DynamoDB tables
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env  # Edit .env with your configuration
npm run dev
```

## Testing

The application includes a comprehensive suite of tests for both frontend and backend:

- Run backend tests: `cd backend && npm test`
- Run frontend tests: `cd frontend && npm test`

For more details, see [TESTING.md](TESTING.md).

## Deployment

### Local Docker Deployment

```bash
# Build and run backend
docker build -f backend/Backend.containerfile -t lunch-buddy-backend .
docker run -p 3000:3000 -d lunch-buddy-backend

# Build and run frontend
docker build -f frontend/Frontend.containerfile -t lunch-buddy-frontend .
docker run -p 8080:8080 -d lunch-buddy-frontend
```

### Kubernetes Deployment

See the configuration files in the `k8s/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin my-feature`
5. Submit a pull request

Please ensure your code passes all tests before submitting a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
