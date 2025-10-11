#!/bin/bash

# ==============================================
# Backend Server Stop Script
# ==============================================
# Purpose: Safely stop backend server
# Usage: ./scripts/stop-backend.sh

PORT=3001

echo "🛑 Stopping backend server..."

# Kill process on port 3001
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "⚠️  Killing process on port $PORT..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
else
    echo "ℹ️  No process found on port $PORT"
fi

# Kill any tsx processes
echo "🧹 Cleaning up tsx processes..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "we-warehouse-backend" 2>/dev/null || true

# Verify stopped
sleep 1
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "❌ Failed to stop backend server"
    exit 1
fi

echo "✅ Backend server stopped successfully"
