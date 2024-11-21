# Use an official node image to build the React app
FROM node:18 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY ../package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application code
COPY .. .

# Build the React app
RUN pnpm run build

# Use an official node image to serve the React app
FROM node:18

# Set the working directory
WORKDIR /app

# Copy the build output and server file
COPY --from=build /app/dist ./build
COPY ../docker/node/server.js .

# Install express
RUN npm install express

# Expose port 8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]