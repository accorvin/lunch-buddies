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
   NODE_ENV=development node scripts/setup-dynamodb.js
   ```

The local setup will create four tables:
- `LunchBuddyRegistrations`
- `LunchBuddyMatchHistory`
- `LunchBuddyLocations`
- `LunchBuddyMatchSchedule`

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
   NODE_ENV=production DYNAMODB_TABLE_PREFIX=prod_ node scripts/setup-dynamodb.js
   ```

This will create four tables in your production DynamoDB:
- `{prefix}LunchBuddyRegistrations`
- `{prefix}LunchBuddyMatchHistory`
- `{prefix}LunchBuddyLocations`
- `{prefix}LunchBuddyMatchSchedule`

## Database Schema

### Registrations Table
- **Table Name**: `{prefix}LunchBuddyRegistrations`
- **Primary Key**: `userId` (String)
- **Attributes**:
  - `name` (String)
  - `email` (String)
  - `department` (String)
  - `location` (String)
  - `preferences` (String, JSON serialized)
  - `createdAt` (String, ISO date)
  - `updatedAt` (String, ISO date)

### Match History Table
- **Table Name**: `{prefix}LunchBuddyMatchHistory`
- **Primary Key**: `matchId` (String)
- **Attributes**:
  - `date` (String, ISO date)
  - `location` (String)
  - `matches` (String, JSON serialized)

### Locations Table
- **Table Name**: `{prefix}LunchBuddyLocations`
- **Primary Key**: `locationId` (String)
- **Attributes**:
  - `name` (String)
  - `description` (String)
  - `siteLeaderEmail` (String)
  - `createdAt` (String, ISO date)
  - `updatedAt` (String, ISO date)
  - `isActive` (Boolean)

### Match Schedule Table
- **Table Name**: `{prefix}LunchBuddyMatchSchedule`
- **Primary Key**: `id` (String)
- **Attributes**:
  - `date` (String, ISO date)

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

## Multi-Location Setup

### Initial Location Configuration
1. Create initial locations:
```bash
cd backend
node scripts/create-initial-locations.js
```

2. Verify location setup:
```bash
node scripts/verify-locations.js
```

### Location Management
- Locations can be managed through the admin interface
- Each location must have a designated site leader
- Location data is used for:
  - Participant registration
  - Match generation
  - Statistics tracking

### Data Migration
When adding location support to an existing deployment:
1. Update table schemas
2. Run migration scripts
3. Verify data integrity
4. Update application configuration

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