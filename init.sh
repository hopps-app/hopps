#!/usr/bin/env bash
# ===========================================================================
# Hopps - Development Environment Setup Script
# ===========================================================================
# This script sets up and starts the full Hopps development environment:
#   - PostgreSQL 16 (via Docker Compose)
#   - Keycloak 26 (via Docker Compose)
#   - LocalStack / MinIO (S3 mock, via Docker Compose)
#   - Backend: Quarkus microservices (app.hopps.org on port 8101)
#   - Frontend: React SPA (Vite dev server on port 5173)
# ===========================================================================

set -e

PROJECT_DIR="$(dirname "$(readlink -f "$0")")"

echo "=========================================="
echo "  Hopps Development Environment Setup"
echo "=========================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
echo "[1/6] Checking prerequisites..."

command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm is required but not installed. Run: npm install -g pnpm"; exit 1; }

# Check Java (required for backend)
if command -v java >/dev/null 2>&1; then
  JAVA_VER=$(java -version 2>&1 | head -n1)
  echo "  Java: $JAVA_VER"
else
  echo "WARNING: Java 21 is required for backend development but not found."
  echo "  Backend services will run via Docker Compose instead."
fi

echo "  Node: $(node --version)"
echo "  pnpm: $(pnpm --version)"
echo "  Docker: $(docker --version | head -c 50)"
echo ""

# ---------------------------------------------------------------------------
# 2. Start Docker infrastructure (PostgreSQL, Keycloak, LocalStack)
# ---------------------------------------------------------------------------
echo "[2/6] Starting Docker infrastructure..."
echo "  Starting PostgreSQL, Keycloak, LocalStack, and backend services..."

docker compose -f "$PROJECT_DIR/infrastructure/hopps-app/docker-compose.yaml" up -d

echo "  Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for PostgreSQL
for i in $(seq 1 30); do
  if docker compose -f "$PROJECT_DIR/infrastructure/hopps-app/docker-compose.yaml" exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "  PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "WARNING: PostgreSQL may not be ready yet. Continuing anyway..."
  fi
  sleep 2
done

echo ""

# ---------------------------------------------------------------------------
# 3. Wait for Keycloak
# ---------------------------------------------------------------------------
echo "[3/6] Waiting for Keycloak to start..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:8092/health/ready >/dev/null 2>&1; then
    echo "  Keycloak is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "WARNING: Keycloak may not be ready yet. Check http://localhost:8092"
  fi
  sleep 3
done
echo ""

# ---------------------------------------------------------------------------
# 4. Install frontend dependencies
# ---------------------------------------------------------------------------
echo "[4/6] Installing frontend dependencies..."

# Install api-client and SPA dependencies
pnpm --dir "$PROJECT_DIR/frontend" install

# Build the API client (required by SPA)
echo "  Building API client..."
pnpm --dir "$PROJECT_DIR/frontend/api-client" run build 2>/dev/null || echo "  WARNING: API client build skipped (may need backend OpenAPI spec first)"

echo ""

# ---------------------------------------------------------------------------
# 5. Start the SPA dev server
# ---------------------------------------------------------------------------
echo "[5/6] Starting SPA development server..."

pnpm --dir "$PROJECT_DIR/frontend/spa" run dev &
SPA_PID=$!

echo "  SPA dev server starting (PID: $SPA_PID)..."
echo ""

# ---------------------------------------------------------------------------
# 6. Print status
# ---------------------------------------------------------------------------
echo "[6/6] Setup complete!"
echo ""
echo "=========================================="
echo "  Hopps Development Environment"
echo "=========================================="
echo ""
echo "  Services:"
echo "    Frontend SPA:      http://localhost:5173"
echo "    Backend (org):     http://localhost:8080"
echo "    Backend (fin):     http://localhost:8081"
echo "    Backend (doc-ai):  http://localhost:8100"
echo "    PostgreSQL:        localhost:5432 (user: postgres, pass: postgres)"
echo "    Keycloak Admin:    http://localhost:8092 (admin/admin)"
echo ""
echo "  Databases:"
echo "    org:       jdbc:postgresql://localhost:5432/org"
echo "    fin:       jdbc:postgresql://localhost:5432/fin"
echo "    keycloak:  jdbc:postgresql://localhost:5432/keycloak"
echo ""
echo "  Keycloak Realm:      hopps"
echo "  Swagger UI (org):    http://localhost:8080/q/swagger-ui"
echo ""
echo "  To stop: docker compose -f infrastructure/hopps-app/docker-compose.yaml down"
echo "  To rebuild SPA: pnpm --dir frontend/spa run build"
echo "  To run tests: pnpm --dir frontend/spa run validate"
echo ""
echo "=========================================="

# Keep running (foreground)
wait $SPA_PID 2>/dev/null || true
