#!/bin/bash

set -e

# Step 1: Build the theme
echo "🔧 Building Keycloak theme..."
pnpm install
pnpm run build-keycloak-theme

# Step 2: Unpack jar
echo "📦 Unpacking .jar file..."
mkdir -p dist_keycloak/unpacked/theme
cd dist_keycloak/unpacked
for jar in ../*.jar; do
  unzip -o "$jar" -d .
done

# Step 3: Start Docker
echo "🚀 Starting Keycloak with Bitnami..."
cd ../../
docker compose up --build