# Simple runtime image - uses pre-built dist from CI
FROM node:22-slim

# Environment variables (replaced at runtime by replaceEnvs.sh)
ENV VITE_TITLE="VITE_TITLE_VALUE"
ENV VITE_GENERAL_DATE_FORMAT="VITE_GENERAL_DATE_FORMAT_VALUE"
ENV VITE_GENERAL_CURRENCY_SYMBOL_AFTER="VITE_GENERAL_CURRENCY_SYMBOL_AFTER_VALUE"
ENV VITE_KEYCLOAK_URL="VITE_KEYCLOAK_URL_VALUE"
ENV VITE_KEYCLOAK_REALM="VITE_KEYCLOAK_REALM_VALUE"
ENV VITE_KEYCLOAK_CLIENT_ID="VITE_KEYCLOAK_CLIENT_ID_VALUE"
ENV VITE_API_ORG_URL="VITE_API_ORG_URL_VALUE"
ENV VITE_API_FIN_URL="VITE_API_FIN_URL_VALUE"

WORKDIR /app

# Copy the pre-built React app (built by CI before Docker step)
COPY dist ./build

# Copy server and scripts
COPY docker/node/server.js .
COPY docker/replaceEnvs.sh .
COPY docker/startup.sh .

# Install express for serving
RUN npm install express@5.1.0

# Make scripts executable
RUN chmod +x ./replaceEnvs.sh ./startup.sh

# Set ownership for node user
RUN chown -R node:node /app

EXPOSE 8080

# Start the server (replaces env placeholders at runtime, then starts express)
CMD ["sh", "./startup.sh"]
