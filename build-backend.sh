#!/bin/bash
# Build script for Hopps backend

set -e

echo "Building parent POM..."
cd /workspace
mvn -B -N clean install --file pom.xml

echo "Building org service..."
cd /workspace/app.hopps.org
mvn -B clean package --file pom.xml

echo "Build complete!"
