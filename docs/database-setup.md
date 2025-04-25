# Database Setup Guide

This guide covers setting up both local and production databases for the Lunch Buddy application.

## Table of Contents
- [Local Development Setup](#local-development-setup)
- [Production Setup](#production-setup)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites
- Podman installed and running
- Node.js and npm installed

### Steps
1. Start the local DynamoDB container:
   ```bash
   podman run -p 8000:8000 amazon/dynamodb-local
   ```

2. Create the local tables:
   ```bash
   cd backend
   npm run setup-local-db
   ```

The local setup will create two tables:
- `LunchBuddyRegistrations`
- `LunchBuddyMatchHistory`

## Production Setup

### Prerequisites
- AWS account with DynamoDB access
- AWS IAM user with appropriate permissions
- AWS credentials configured

### AWS IAM Permissions
Create an IAM user with the following permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:CreateTable",
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:DeleteItem",
                "dynamodb:Scan",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/*"
        }
    ]
}
```

### Environment Variables
Set the following environment variables in your production environment:

```bash
AWS_REGION=your-region  # e.g., us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_PREFIX=your-prefix  # Optional, for environment separation
```

### Creating Production Tables
1. Set up your AWS credentials in the environment
2. Run the setup script:
   ```bash
   cd backend
   npm run setup-prod-db
   ```

This will create two tables in your production DynamoDB:
- `{prefix}LunchBuddyRegistrations`
- `{prefix}LunchBuddyMatchHistory`

## Database Schema

### Registrations Table
- **Table Name**: `{prefix}LunchBuddyRegistrations`
- **Primary Key**: `userId` (String)
- **Attributes**:
  - `name` (String)
  - `email` (String)
  - `department` (String)
  - `preferences` (String, JSON serialized)
  - `createdAt` (String, ISO date)
  - `updatedAt` (String, ISO date)

### Match History Table
- **Table Name**: `{prefix}LunchBuddyMatchHistory`
- **Primary Key**: `matchId` (String)
- **Attributes**:
  - `date` (String, ISO date)
  - `matches` (String, JSON serialized)

## Environment Variables

### Required Variables
```bash
# AWS Configuration
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional
DYNAMODB_TABLE_PREFIX=your-prefix
```

### Local Development
For local development, no AWS credentials are needed. The application will automatically use the local DynamoDB instance.

## Troubleshooting

### Common Issues

1. **Table Creation Fails**
   - Check AWS credentials
   - Verify IAM permissions
   - Check if table already exists

2. **Connection Issues**
   - Verify AWS region
   - Check network connectivity
   - Verify DynamoDB service status

3. **Permission Errors**
   - Review IAM permissions
   - Check AWS credentials
   - Verify resource ARNs

### Debugging
- Enable AWS SDK logging:
  ```bash
  export AWS_SDK_LOAD_CONFIG=1
  export AWS_SDK_LOG_LEVEL=debug
  ```

- Check AWS CloudWatch logs for DynamoDB operations

### Support
For additional support:
1. Check AWS DynamoDB documentation
2. Review application logs
3. Contact system administrator 