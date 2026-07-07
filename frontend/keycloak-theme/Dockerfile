ARG KEYCLOAK_VERSION=26.2.1

# Build stage
FROM node:lts-alpine AS builder

# Install pnpm (pinned to the repo's pnpm version) and Maven
RUN apk add --no-cache maven && \
    npm install -g pnpm@10.29.3

# Set the working directory
WORKDIR /app

# Copy package files
COPY ./ ./

# Install dependencies.
# --ignore-scripts avoids pnpm 10's ERR_PNPM_IGNORED_BUILDS 
RUN pnpm install --ignore-scripts

# Build the application
RUN npm run build-keycloak-theme
# Keycloak
FROM keycloak/keycloak:${KEYCLOAK_VERSION}

COPY --from=builder /app/dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar /opt/keycloak/providers/hopps-theme.jar
