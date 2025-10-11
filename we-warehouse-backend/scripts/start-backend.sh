#!/bin/bash

# ==============================================
# Backend Server Startup Script
# ==============================================
# Purpose: Kill old processes and start fresh
# Usage: ./scripts/start-backend.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT=3001

echo "🔍 Checking for existing backend processes..."

# Kill any process using port 3001
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "⚠️  Found process on port $PORT, killing..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Kill any old tsx/node processes running our backend
echo "🧹 Cleaning up old backend processes..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "we-warehouse-backend" 2>/dev/null || true
sleep 1

# Verify port is free
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "❌ Failed to free port $PORT"
    exit 1
fi

echo "✅ Port $PORT is free"

# Check .env file
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file with required configuration"
    exit 1
fi

echo "✅ .env file found"

# Start backend server
echo "🚀 Starting backend server..."
cd "$PROJECT_DIR"
npm run dev

echo "✨ Backend server started successfully!"
