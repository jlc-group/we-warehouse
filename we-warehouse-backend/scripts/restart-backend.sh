#!/bin/bash

# ==============================================
# Backend Server Restart Script
# ==============================================
# Purpose: Stop and restart backend server
# Usage: ./scripts/restart-backend.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔄 Restarting backend server..."
echo ""

# Stop backend
"$SCRIPT_DIR/stop-backend.sh"

echo ""
echo "⏳ Waiting 2 seconds..."
sleep 2

# Start backend
"$SCRIPT_DIR/start-backend.sh"
