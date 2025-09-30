# Dockerfile Update Plan

## Current Issue
The Dockerfile is trying to run database migrations during the build process on line 21:
```
RUN npm run migrate --if-present
```

This is causing the build to fail because the database is not available during the build process. The database is only available when the application is running.

## Proposed Solution
Remove the database migration step from the Dockerfile build process. The migrations should be run when the application starts, not during the build.

## Updated Dockerfile
The Dockerfile should be updated to remove line 21:
```dockerfile
# Use the official Node.js 18 image
# https://hub.docker.com/_/node
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Add a build arg to bust cache
ARG BUILD_DATE=unknown

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
```

The application code already has logic to run migrations when the server starts, so we don't need to run them during the build process.