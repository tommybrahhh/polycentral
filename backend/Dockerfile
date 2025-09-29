# Use the official Node.js 18 image
# https://hub.docker.com/_/node
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Run database migrations
RUN npm run migrate --if-present

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]