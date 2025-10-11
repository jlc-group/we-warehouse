#!/bin/bash

# ==============================================
# Backend Health Check Script
# ==============================================
# Purpose: Check if backend is running correctly
# Usage: ./scripts/check-backend.sh

PORT=3001
HEALTH_ENDPOINT="http://localhost:$PORT/health"
API_ENDPOINT="http://localhost:$PORT/api/sales/packing-list?tax_date=2025-10-09"

echo "🔍 Checking backend server status..."
echo ""

# Check if port is in use
if ! lsof -ti:$PORT >/dev/null 2>&1; then
    echo "❌ Backend server is NOT running (port $PORT is free)"
    echo ""
    echo "💡 To start the backend:"
    echo "   cd we-warehouse-backend"
    echo "   ./scripts/start-backend.sh"
    exit 1
fi

echo "✅ Process found on port $PORT"

# Check health endpoint
echo ""
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null | tail -1)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health check passed"
    curl -s "$HEALTH_ENDPOINT" | jq '.' 2>/dev/null || curl -s "$HEALTH_ENDPOINT"
else
    echo "❌ Health check failed (HTTP $HEALTH_RESPONSE)"
    exit 1
fi

# Check API endpoint
echo ""
echo "📊 Testing API endpoint..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT" 2>/dev/null | tail -1)

if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ API endpoint working"
    curl -s "$API_ENDPOINT" | jq '.success, .count' 2>/dev/null || echo "API responded successfully"
else
    echo "⚠️  API endpoint returned HTTP $API_RESPONSE"
    if [ "$API_RESPONSE" = "500" ]; then
        echo "💡 Database connection might be failing"
    fi
fi

echo ""
echo "✨ Backend health check complete!"
