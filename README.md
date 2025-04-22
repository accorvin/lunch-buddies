# Lunch Buddy App

A web application that helps employees find lunch buddies based on their availability and preferences.

## Features

- User authentication and authorization
- Availability scheduling
- Automated buddy matching
- Admin dashboard for match management
- Match history tracking
- Responsive design

## Tech Stack

- **Frontend:**
  - React with TypeScript
  - Vite
  - PatternFly UI components
  - Tailwind CSS
  - AWS Amplify for authentication

- **Backend:**
  - Node.js
  - Express
  - SQLite for data storage
  - AWS Cognito integration

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lunch-buddy-app.git
   cd lunch-buddy-app
   ```

2. **Set up environment variables**
   - Copy `frontend/.env.example` to `frontend/.env`
   - Copy `backend/.env.example` to `backend/.env`
   - Update the values in both `.env` files with your configuration

3. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

4. **Start the development servers**
   ```bash
   # Start the backend server in development mode (from backend directory)
   npm run dev

   # Start the frontend development server (from frontend directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080

## Project Structure

```
lunch-buddy-app/
├── frontend/           # React frontend application
│   ├── src/           # Source code
│   ├── public/        # Static assets
│   └── ...            # Configuration files
├── backend/           # Node.js backend server
│   ├── data/         # Database files
│   └── server.js     # Main server file
└── k8s/              # Kubernetes deployment files
```

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices and hooks conventions
- Use functional components
- Maintain consistent code formatting (Prettier)
- Follow ESLint rules

### Testing
- Write unit tests for critical functionality
- Use React Testing Library for component tests
- Test API endpoints with appropriate test data

### Git Workflow
1. Create feature branches from `main`
2. Follow conventional commits
3. Keep commits atomic and focused
4. Write clear commit messages
5. Create pull requests for review

### Deployment
1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the backend:
   ```bash
   cd backend
   npm start
   ```

3. For production deployment:
   - Use environment variables for configuration
   - Enable production mode
   - Set up proper CORS settings
   - Configure SSL/TLS

### Environment Setup
- Development: `NODE_ENV=development`
- Production: `NODE_ENV=production`
- Testing: `NODE_ENV=test`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- PatternFly for the UI components
- AWS for authentication services
- The open-source community for various tools and libraries
