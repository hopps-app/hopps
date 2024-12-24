# Use an official node image to build the React app
FROM node:18 AS build

# General
ENV VITE_TITLE="VITE_TITLE"
ENV VITE_GENERAL_DATE_FORMAT="VITE_GENERAL_DATE_FORMAT"
ENV VITE_GENERAL_CURRENCY_SYMBOL_AFTER="VITE_GENERAL_CURRENCY_SYMBOL_AFTER"
ENV VITE_KEYCLOAK_URL="VITE_KEYCLOAK_URL"
ENV VITE_KEYCLOAK_REALM="VITE_KEYCLOAK_REALM"
ENV VITE_KEYCLOAK_CLIENT_ID="VITE_KEYCLOAK_CLIENT_ID"
ENV VITE_API_URL="VITE_API_URL"

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
COPY ../docker/replaceEnvs.sh ./replaceEnvs.sh
COPY ../docker/startup.sh ./startup.sh

# Make scripts executable
RUN chmod +x ./replaceEnvs.sh
RUN chmod +x ./startup.sh

# add node user as owner
RUN chown node:node /app/*

# Start the server
CMD ["/bin/bash", "-c", "/app/startup.sh"]
