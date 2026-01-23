#!/bin/bash

# Base directory
BASE_DIR="/Users/chanack/Documents/Weproject/GitHub/App/we-warehouse"

echo "Starting We Warehouse System..."

# Function to kill process on port
kill_port() {
  PORT=$1
  PID=$(lsof -ti :$PORT)
  if [ -n "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)..."
    kill -9 $PID
  fi
}

# Cleanup ports
kill_port 3000
kill_port 5173
kill_port 11434 # Ollama default port

# Check for and clear partial vite cache if needed (optional but good for "spinning" issues)
if [ -d "$BASE_DIR/node_modules/.vite" ]; then
    echo "Clearing Vite cache to ensure clean start..."
    rm -rf "$BASE_DIR/node_modules/.vite"
fi

# 1. Start Ollama
echo "Launching Ollama..."
osascript -e 'tell application "Terminal" to do script "echo \"Starting Ollama...\"; ollama serve"'

# 2. Start Backend
echo "Launching Backend..."
osascript -e "tell application \"Terminal\" to do script \"echo \\\"Starting Backend...\\\"; cd '$BASE_DIR/we-warehouse-backend' && npm run dev\""

# 3. Start Frontend
echo "Launching Frontend..."
osascript -e "tell application \"Terminal\" to do script \"echo \\\"Starting Frontend...\\\"; cd '$BASE_DIR' && npm run dev\""

echo "All services launched in separate Terminal windows."
