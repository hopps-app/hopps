ARG KEYCLOAK_VERSION=26.2.1

# Build stage
FROM node:lts-alpine AS builder

# Install pnpm and Python
RUN apk add --no-cache maven && \
    npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy package files
COPY ./ ./

# Install dependencies
RUN pnpm install

# Build the application
RUN npm run build-keycloak-theme
# Keycloak
FROM keycloak/keycloak:${KEYCLOAK_VERSION}

COPY --from=builder /app/dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar /opt/keycloak/providers/hopps-theme.jar
