# Deployment Guide

## Prerequisites
- AWS CLI installed and configured
- Podman installed (for local testing)
- Node.js 18.x installed
- Git installed

## Initial Setup

1. Install AWS CLI:
```bash
brew install awscli
```

2. Configure AWS CLI:
```bash
aws configure
```
Enter your AWS credentials when prompted.

3. Install Podman (for local testing):
```bash
brew install podman
```

4. Start Podman machine (if on macOS):
```bash
podman machine init
podman machine start
```

## Database Setup

1. Create a `.env` file in the backend directory:
```bash
cd backend
cp .env.example .env
```

2. Edit the `.env` file with your configuration:
```bash
# Server Configuration
PORT=8080
NODE_ENV=production

# Database Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
DYNAMODB_TABLE_PREFIX=LunchBuddy

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT Configuration
JWT_SECRET=your-jwt-secret

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com

# Slack Configuration
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_ADMIN_EMAIL=your-admin-email
ADMIN_EMAILS=your-admin-email,another-admin@example.com
```

3. Set up DynamoDB tables:
```bash
# For development
NODE_ENV=development node scripts/setup-dynamodb.js

# For production
NODE_ENV=production node scripts/setup-dynamodb.js
```

## Frontend Deployment (AWS Amplify)

1. Build the frontend locally (optional, for testing):
```bash
cd frontend
npm run build
```

2. Deploy using AWS Amplify Console:
   - Go to AWS Amplify Console
   - Click "New app" > "Host web app"
   - Connect your Git repository
   - Configure build settings:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - cd frontend
             - npm install
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: frontend/dist
         files:
           - '**/*'
       cache:
         paths:
           - frontend/node_modules/**/*
     ```
   - In the Amplify Console, also set:
     - Base directory: `frontend`
     - Build command: `npm run build`
     - Output directory: `dist`
   - Add environment variables:
     - `VITE_BACKEND_URL`: Your backend App Runner URL
     - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - Review and deploy

3. Configure custom domain (optional):
   - In Amplify Console, go to "Domain Management"
   - Add your custom domain
   - Follow the DNS configuration instructions

## Backend Deployment (AWS App Runner)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Build the container image:
```bash
podman build -t lunch-buddy-backend -f Backend.containerfile .
```

3. Test the container locally:
```bash
podman run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e FRONTEND_URL=https://your-amplify-domain.com \
  -e GOOGLE_CLIENT_ID=your-google-client-id \
  -e GOOGLE_CLIENT_SECRET=your-google-client-secret \
  -e SLACK_ADMIN_EMAIL=your-admin-email \
  -e SLACK_BOT_TOKEN=your-slack-bot-token \
  -e JWT_SECRET=your-secure-random-string \
  -e AWS_REGION=us-east-1 \
  -e AWS_ACCESS_KEY_ID=your-aws-access-key \
  -e AWS_SECRET_ACCESS_KEY=your-aws-secret-key \
  lunch-buddy-backend
```

4. Create an ECR repository:
```bash
aws ecr create-repository --repository-name lunch-buddy-backend
```

5. Authenticate Podman to ECR:
```bash
aws ecr get-login-password --region us-east-1 | podman login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com
```

6. Tag and push the image:
```bash
podman tag localhost/lunch-buddy-backend:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/lunch-buddy-backend:latest
podman push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/lunch-buddy-backend:latest
```

7. Create App Runner service using AWS Console:
   - Go to AWS App Runner console
   - Click "Create service"
   - Choose "Container registry" as source
   - Select your ECR repository
   - Configure service:
     - Service name: lunch-buddy-backend
     - Port: 8080
     - Environment variables:
       - NODE_ENV: production
       - PORT: 8080
       - FRONTEND_URL: https://your-amplify-domain.com
       - GOOGLE_CLIENT_ID: your-google-client-id
       - GOOGLE_CLIENT_SECRET: your-google-client-secret
       - SLACK_ADMIN_EMAIL: your-admin-email
       - SLACK_BOT_TOKEN: your-slack-bot-token
       - JWT_SECRET: your-secure-random-string
       - AWS_REGION: us-east-1
       - AWS_ACCESS_KEY_ID: your-aws-access-key
       - AWS_SECRET_ACCESS_KEY: your-aws-secret-key
     - Auto scaling: 1-4 instances
     - CPU: 1 vCPU
     - Memory: 2 GB

## Environment Variables

### Frontend (Amplify)
- `VITE_BACKEND_URL`: Your backend App Runner URL
- `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID

### Backend (App Runner)
- `NODE_ENV`: production
- `PORT`: 8080
- `FRONTEND_URL`: https://your-amplify-domain.com
- `GOOGLE_CLIENT_ID`: your-google-client-id
- `GOOGLE_CLIENT_SECRET`: your-google-client-secret
- `SLACK_ADMIN_EMAIL`: your-admin-email
- `SLACK_BOT_TOKEN`: your-slack-bot-token
- `JWT_SECRET`: A secure random string used for JWT signing (generate using `openssl rand -base64 32`)
- `AWS_REGION`: Your AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `DYNAMODB_TABLE_PREFIX`: LunchBuddy (for production) or empty (for development)
- `ADMIN_EMAILS`: Comma-separated list of admin email addresses

## Multi-Location Deployment Considerations

### Initial Setup
1. Before deploying, ensure your DynamoDB tables are configured to handle location data:
   - The `LunchBuddyRegistrations` table includes location fields
   - The `LunchBuddyMatchHistory` table supports location-based matching

2. Configure site leaders:
   - Add site leader emails to the admin configuration
   - Ensure site leaders have appropriate permissions in the system

### Production Configuration
1. Location Management:
   - Each deployment can support multiple locations
   - Site leaders can manage their respective locations
   - Statistics and matching are handled per location

2. Monitoring:
   - Set up CloudWatch metrics to track:
     - Registrations per location
     - Match success rates by location
     - Location-specific usage patterns

3. Backup Strategy:
   - Ensure DynamoDB backups include location data
   - Consider location-specific backup schedules if needed

4. Scaling:
   - Monitor performance across locations
   - Adjust instance count based on total user distribution
   - Consider regional deployments for better latency

## Common Commands

### Frontend
- Trigger new deployment:
```bash
aws amplify start-job --app-id <your-app-id> --branch-name main --job-type RELEASE
```

### Backend
- View service status:
```bash
aws apprunner describe-service --service-arn <your-service-arn>
```

- View logs:
```bash
aws apprunner describe-service --service-arn <your-service-arn> --query 'Service.ServiceUrl'
```

- Update service:
```bash
# After pushing new image to ECR
aws apprunner update-service --service-arn <your-service-arn> --source-configuration '{"ImageRepository": {"ImageIdentifier": "<your-ecr-repo>:latest"}}'
```

## Testing

For testing the backend API, see the [Testing Guide](testing.md).

## Troubleshooting

### Frontend Issues
1. If build fails:
   - Check build logs in Amplify Console
   - Verify environment variables are set correctly
   - Ensure all dependencies are in package.json

2. If site is not accessible:
   - Check domain configuration
   - Verify SSL certificate status
   - Check CORS settings in backend

### Backend Issues
1. If container fails to start:
   - Check container logs in App Runner console
   - Verify all environment variables are set correctly
   - Ensure the container can access required resources

2. If deployment fails:
   - Check ECR repository permissions
   - Verify IAM roles have necessary permissions
   - Check container health check configuration

3. If service is not accessible:
   - Verify security group settings
   - Check VPC configuration if using custom VPC
   - Verify domain configuration if using custom domain

4. If DynamoDB operations fail:
   - Verify AWS credentials and permissions
   - Check DynamoDB table configuration
   - Verify table names match the expected format

5. Podman-specific issues:
   - If you get permission errors, try running with `--privileged` flag
   - For macOS, ensure the Podman machine is running
   - If networking issues occur, check Podman machine network settings 