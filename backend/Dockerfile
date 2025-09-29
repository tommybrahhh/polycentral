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

# Run database migrations
RUN npm run migrate --if-present

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]