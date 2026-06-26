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

set -euo pipefail

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
LOG_DIR="$PROJECT_DIR/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

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
npm install

echo -e "${YELLOW}[2/5] Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install

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
mkdir -p "$LOG_DIR"
: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"

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

show_recent_logs() {
    echo ""
    echo -e "${RED}Recent backend log:${NC}"
    tail -80 "$BACKEND_LOG" 2>/dev/null || true
    echo ""
    echo -e "${RED}Recent frontend log:${NC}"
    tail -80 "$FRONTEND_LOG" 2>/dev/null || true
}

ensure_running() {
    local pid=$1
    local name=$2
    local log_file=$3
    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "${RED}${name} exited during startup. Full log: ${log_file}${NC}"
        tail -120 "$log_file" 2>/dev/null || true
        exit 1
    fi
}

wait_for_url() {
    local name=$1
    local url=$2
    local pid=$3
    local log_file=$4
    local attempts=${5:-60}

    echo -e "  ${CYAN}Waiting for ${name}: ${url}${NC}"
    for ((i=1; i<=attempts; i++)); do
        ensure_running "$pid" "$name" "$log_file"
        if curl -fsS "$url" > /dev/null 2>&1; then
            echo -e "  ${GREEN}${name} is ready${NC}"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}${name} did not become ready after ${attempts}s. Full log: ${log_file}${NC}"
    tail -160 "$log_file" 2>/dev/null || true
    exit 1
}

# Start backend with nodemon for hot reload
echo -e "  ${BLUE}Starting backend on port ${BACKEND_PORT} (with nodemon hot-reload)...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon --watch src --ext js,json src/index.js 2>&1 | tee "$BACKEND_LOG" &
BACKEND_PID=$!

# Wait for backend to be ready
wait_for_url "backend" "http://localhost:$BACKEND_PORT/api/health" "$BACKEND_PID" "$BACKEND_LOG" 60

# Start frontend with React dev server (has built-in hot reload)
echo -e "  ${BLUE}Starting frontend on port ${FRONTEND_PORT} (with hot-reload)...${NC}"
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=$FRONTEND_PORT npm start 2>&1 | tee "$FRONTEND_LOG" &
FRONTEND_PID=$!

# Wait for frontend readiness instead of assuming success after a fixed sleep.
wait_for_url "frontend" "http://localhost:$FRONTEND_PORT" "$FRONTEND_PID" "$FRONTEND_LOG" 90

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Application is running!                                 ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:${FRONTEND_PORT}                        ║${NC}"
echo -e "${GREEN}║  Backend:   http://localhost:${BACKEND_PORT}                        ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  Live logs:                                              ║${NC}"
echo -e "${GREEN}║    Backend:  logs/backend.log                            ║${NC}"
echo -e "${GREEN}║    Frontend: logs/frontend.log                           ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  Demo Login:                                             ║${NC}"
echo -e "${GREEN}║    Email:    admin@healthbilling.com                     ║${NC}"
echo -e "${GREEN}║    Password: admin123                                    ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all servers                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Keep script running and forward signals
wait $BACKEND_PID $FRONTEND_PID || {
    echo -e "${RED}One of the servers exited. Showing recent logs.${NC}"
    show_recent_logs
    exit 1
}
