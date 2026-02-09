#!/bin/bash
# Database Health Check Script
# This script verifies the database connection and schema for Features #1 and #2

echo "=========================================="
echo "Database Health Check"
echo "=========================================="
echo ""

# Feature #1: Database Connection
echo "[Feature #1] Verifying database connection..."
CONNECTION_TEST=$(docker exec hopps-app-postgres-1 psql -U postgres -d org -c "SELECT 1;" 2>&1)
if echo "$CONNECTION_TEST" | grep -q "1 row"; then
    echo "✅ Database connection: HEALTHY"
else
    echo "❌ Database connection: FAILED"
    echo "$CONNECTION_TEST"
    exit 1
fi
echo ""

# Verify Flyway migrations applied
echo "[Feature #1] Verifying Flyway migrations..."
MIGRATION_COUNT=$(docker exec hopps-app-postgres-1 psql -U postgres -d org -t -c "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true;")
if [ "$MIGRATION_COUNT" -ge 9 ]; then
    echo "✅ Flyway migrations: $MIGRATION_COUNT applied successfully"
else
    echo "❌ Flyway migrations: Only $MIGRATION_COUNT found (expected 9)"
    exit 1
fi
echo ""

# Feature #2: Database Schema
echo "[Feature #2] Verifying database schema..."

# Check for required tables
TABLES=("organization" "member" "bommel" "transactionrecord" "trade_party")
for table in "${TABLES[@]}"; do
    TABLE_EXISTS=$(docker exec hopps-app-postgres-1 psql -U postgres -d org -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    if echo "$TABLE_EXISTS" | grep -q "t"; then
        echo "✅ Table exists: $table"
    else
        echo "❌ Table missing: $table"
        exit 1
    fi
done
echo ""

# Verify bommel table structure
echo "[Feature #2] Verifying bommel table columns..."
BOMMEL_COLUMNS=$(docker exec hopps-app-postgres-1 psql -U postgres -d org -t -c "\d bommel" | grep -E "id|name|emoji|parent_id|responsiblemember_id|organization_id")
if echo "$BOMMEL_COLUMNS" | grep -q "id" && \
   echo "$BOMMEL_COLUMNS" | grep -q "name" && \
   echo "$BOMMEL_COLUMNS" | grep -q "emoji" && \
   echo "$BOMMEL_COLUMNS" | grep -q "parent_id" && \
   echo "$BOMMEL_COLUMNS" | grep -q "organization_id"; then
    echo "✅ Bommel table structure: CORRECT"
else
    echo "❌ Bommel table structure: MISSING COLUMNS"
    exit 1
fi
echo ""

# Verify transactionrecord table structure
echo "[Feature #2] Verifying transactionrecord table columns..."
TX_COLUMNS=$(docker exec hopps-app-postgres-1 psql -U postgres -d org -t -c "\d transactionrecord" | grep -E "id|bommel_id|document_key|name|total")
if echo "$TX_COLUMNS" | grep -q "id" && \
   echo "$TX_COLUMNS" | grep -q "bommel_id" && \
   echo "$TX_COLUMNS" | grep -q "document_key" && \
   echo "$TX_COLUMNS" | grep -q "name" && \
   echo "$TX_COLUMNS" | grep -q "total"; then
    echo "✅ TransactionRecord table structure: CORRECT"
else
    echo "❌ TransactionRecord table structure: MISSING COLUMNS"
    exit 1
fi
echo ""

echo "=========================================="
echo "✅ ALL CHECKS PASSED"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Database connection: HEALTHY"
echo "  - Flyway migrations: APPLIED"
echo "  - Core tables: EXIST"
echo "  - Table structures: CORRECT"
echo ""
