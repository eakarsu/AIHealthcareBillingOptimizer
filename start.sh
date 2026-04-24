#!/bin/bash

# ============================================================
# AI Healthcare Billing Optimizer - Start Script
# ============================================================
# This script:
# 1. Kills any processes on used ports
# 2. Installs dependencies
# 3. Creates and seeds the PostgreSQL database
# 4. Starts backend with hot-reload (nodemon)
# 5. Starts frontend with hot-reload (React dev server)
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=4000
FRONTEND_PORT=3001

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       AI Healthcare Billing Optimizer                    ║${NC}"
echo -e "${CYAN}║       Starting Application...                            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ---- Step 1: Clean up used ports ----
echo -e "${YELLOW}[1/5] Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"

cleanup_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  ${RED}Killing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        echo -e "  ${GREEN}Port $port is free${NC}"
    fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

# ---- Step 2: Install dependencies ----
echo ""
echo -e "${YELLOW}[2/5] Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1

echo -e "${YELLOW}[2/5] Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1

# ---- Step 3: Check PostgreSQL ----
echo ""
echo -e "${YELLOW}[3/5] Checking PostgreSQL...${NC}"

# Source .env
set -a
source "$PROJECT_DIR/.env"
set +a

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo -e "  ${RED}PostgreSQL is not running. Attempting to start...${NC}"
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
        echo -e "  ${RED}Could not start PostgreSQL. Please start it manually.${NC}"
        exit 1
    }
    sleep 2
fi
echo -e "  ${GREEN}PostgreSQL is running${NC}"

# ---- Step 4: Seed database ----
echo ""
echo -e "${YELLOW}[4/5] Seeding database with sample data...${NC}"
cd "$PROJECT_DIR"
node backend/src/seeds/seed.js
echo -e "  ${GREEN}Database seeded successfully${NC}"

# ---- Step 5: Start servers with hot reload ----
echo ""
echo -e "${YELLOW}[5/5] Starting servers with hot-reload...${NC}"

# Trap to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    cleanup_port $BACKEND_PORT
    cleanup_port $FRONTEND_PORT
    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend with nodemon for hot reload
echo -e "  ${BLUE}Starting backend on port ${BACKEND_PORT} (with nodemon hot-reload)...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon --watch src --ext js,json src/index.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo -e "  ${CYAN}Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/api/analytics/dashboard > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Start frontend with React dev server (has built-in hot reload)
echo -e "  ${BLUE}Starting frontend on port ${FRONTEND_PORT} (with hot-reload)...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!

# Wait for frontend
sleep 5

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Application is running!                                 ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:${FRONTEND_PORT}                        ║${NC}"
echo -e "${GREEN}║  Backend:   http://localhost:${BACKEND_PORT}                        ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  Demo Login:                                             ║${NC}"
echo -e "${GREEN}║    Email:    admin@healthbilling.com                     ║${NC}"
echo -e "${GREEN}║    Password: admin123                                    ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all servers                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Keep script running and forward signals
wait
