#!/bin/bash
# ============================================
# We-Warehouse: One-Command Setup Script
# ============================================
# Usage: bash scripts/setup.sh
#
# Prerequisites:
#   - PostgreSQL 17 installed and running
#   - Node.js 18+ installed
#   - psql in PATH (or set PSQL_PATH below)
# ============================================

set -e

# Config
DB_NAME="wewarehouse_local"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
PSQL_PATH="${PSQL_PATH:-psql}"

echo "============================================"
echo "  We-Warehouse Setup"
echo "============================================"
echo ""

# 1. Check PostgreSQL
echo "[1/6] Checking PostgreSQL connection..."
if ! $PSQL_PATH -U $DB_USER -h $DB_HOST -p $DB_PORT -c "SELECT 1" > /dev/null 2>&1; then
    echo "  ERROR: Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
    echo "  Make sure PostgreSQL is running and PGPASSWORD is set"
    exit 1
fi
echo "  OK: PostgreSQL connected"

# 2. Create database if not exists
echo "[2/6] Creating database $DB_NAME..."
if $PSQL_PATH -U $DB_USER -h $DB_HOST -p $DB_PORT -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "  OK: Database already exists"
else
    $PSQL_PATH -U $DB_USER -h $DB_HOST -p $DB_PORT -c "CREATE DATABASE $DB_NAME"
    echo "  OK: Database created"
fi

# 3. Run schema init
echo "[3/6] Initializing schema..."
if [ -f scripts/init_local_db.sql ]; then
    $PSQL_PATH -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f scripts/init_local_db.sql 2>&1 | tail -1
    echo "  OK: Schema initialized"
else
    echo "  SKIP: scripts/init_local_db.sql not found"
fi

# 4. Create RPC functions
echo "[4/6] Creating RPC functions..."
if [ -f scripts/create_rpc_functions.sql ]; then
    $PSQL_PATH -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f scripts/create_rpc_functions.sql 2>&1 | tail -1
    echo "  OK: RPC functions created"
else
    echo "  SKIP: scripts/create_rpc_functions.sql not found"
fi

# 5. Install dependencies
echo "[5/6] Installing dependencies..."
npm install --silent 2>&1 | tail -1
echo "  OK: Frontend deps installed"
cd we-warehouse-backend && npm install --silent 2>&1 | tail -1 && cd ..
echo "  OK: Backend deps installed"

# 6. Create .env files if missing
echo "[6/6] Checking .env files..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Created .env from .env.example (edit values!)"
else
    echo "  OK: .env exists"
fi
if [ ! -f we-warehouse-backend/.env ]; then
    cp we-warehouse-backend/.env.example we-warehouse-backend/.env
    echo "  Created backend .env (edit passwords!)"
else
    echo "  OK: backend .env exists"
fi

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  Next steps:"
echo "  1. Edit .env and we-warehouse-backend/.env with real passwords"
echo "  2. Run data migration: node scripts/migrate_all_supabase_to_local.cjs"
echo "  3. Start backend: cd we-warehouse-backend && npx tsx src/index.ts"
echo "  4. Start frontend: npm run dev"
echo ""
