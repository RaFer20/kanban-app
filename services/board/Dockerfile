# Use an official Node.js image as the base
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# 3. Copy package.json and package-lock.json (or yarn.lock) first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Install dev dependencies for testing
RUN npm install --only=dev

# Copy the rest of the application code
COPY . .

# Build TypeScript code (if using TypeScript)
RUN npm run build

# Expose the port the app runs on (default: 3000)
EXPOSE 3000

# Set the default command to run the app
CMD ["npm", "start"]