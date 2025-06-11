# Use an official node image to build the React app
FROM node:22 AS build

# General
ENV VITE_TITLE="VITE_TITLE_VALUE"
ENV VITE_GENERAL_DATE_FORMAT="VITE_GENERAL_DATE_FORMAT_VALUE"
ENV VITE_GENERAL_CURRENCY_SYMBOL_AFTER="VITE_GENERAL_CURRENCY_SYMBOL_AFTER_VALUE"
ENV VITE_KEYCLOAK_URL="VITE_KEYCLOAK_URL_VALUE"
ENV VITE_KEYCLOAK_REALM="VITE_KEYCLOAK_REALM_VALUE"
ENV VITE_KEYCLOAK_CLIENT_ID="VITE_KEYCLOAK_CLIENT_ID_VALUE"
ENV VITE_API_ORG_URL="VITE_API_ORG_URL_VALUE"
ENV VITE_API_FIN_URL="VITE_API_FIN_URL_VALUE"

ARG USE_WORKSPACES=false

# Set the working directory
WORKDIR /app

COPY .. .

# Copy package.json and lockfile
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build the React app
RUN pnpm run build

# Use an official node image to serve the React app
FROM node:22

# Set the working directory
WORKDIR /app

# Copy the build output and server file
COPY --from=build /app/dist ./build
COPY ../docker/node/server.js .

# Install express and path-to-regexp explicitly
RUN npm install express@5.1.0

# Expose port 8080
EXPOSE 8080
COPY ../docker/replaceEnvs.sh ./replaceEnvs.sh
COPY ../docker/startup.sh ./startup.sh

# Make scripts executable
RUN chmod +x ./replaceEnvs.sh
RUN chmod +x ./startup.sh

# add node user as owner
RUN chown -R node:node /app

# Start the server
CMD ["sh", "./startup.sh"]
