#!/bin/bash

set -e

WORKSPACE_DIR="/paperclip/instances/default/workspaces/c5376712-feaf-462e-acad-91f1949f55f0"
SERVICES=("faq-bot" "invoice-generator-jp" "seasonal-labor-scheduler" "uptime-monitor")
PORTS=(3001 3002 3003 3004)
PIDS=()

echo "═══════════════════════════════════════════════════════════════"
echo "             LOAD TEST SETUP - Building Services"
echo "═══════════════════════════════════════════════════════════════"

# Build all services
echo "🔨 Building all services..."
for service in "${SERVICES[@]}"; do
  echo "   Building $service..."
  cd "$WORKSPACE_DIR/services/$service"
  npm install --silent 2>/dev/null || true
  npm run build > /dev/null 2>&1 || true
done

echo "✅ Build complete"

# Build tourism-booking-api
echo "   Building tourism-booking-api..."
cd "$WORKSPACE_DIR/tourism-booking-api"
npm install --silent 2>/dev/null || true
npm run build > /dev/null 2>&1 || true

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "             LOAD TEST SETUP - Starting Services"
echo "═══════════════════════════════════════════════════════════════"

# Start all services
for i in "${!SERVICES[@]}"; do
  service="${SERVICES[$i]}"
  port="${PORTS[$i]}"

  echo "🚀 Starting $service on port $port..."
  cd "$WORKSPACE_DIR/services/$service"

  PORT=$port node dist/index.js > "/tmp/$service.log" 2>&1 &
  PIDS+=($!)

  # Wait for service to start
  sleep 2
done

# Wait for all services to be ready
echo ""
echo "⏳ Waiting for all services to be ready..."
sleep 3

# Check health
all_ready=true
for i in "${!SERVICES[@]}"; do
  service="${SERVICES[$i]}"
  port="${PORTS[$i]}"

  for attempt in {1..10}; do
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
      echo "✅ $service is ready"
      break
    else
      if [ $attempt -eq 10 ]; then
        echo "❌ $service failed to start"
        all_ready=false
      else
        sleep 1
      fi
    fi
  done
done

if [ "$all_ready" = false ]; then
  echo ""
  echo "❌ Some services failed to start. Checking logs..."
  for service in "${SERVICES[@]}"; do
    echo ""
    echo "--- $service log ---"
    tail -20 "/tmp/$service.log" 2>/dev/null || echo "No log available"
  done

  # Cleanup
  for pid in "${PIDS[@]}"; do
    kill $pid 2>/dev/null || true
  done
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "             LOAD TEST - 1000 Concurrent Users"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run the load test
cd "$WORKSPACE_DIR"
node load-test.js

LOAD_TEST_RESULT=$?

# Cleanup
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "             CLEANUP - Stopping Services"
echo "═══════════════════════════════════════════════════════════════"

for pid in "${PIDS[@]}"; do
  kill $pid 2>/dev/null || true
done

wait ${PIDS[@]} 2>/dev/null || true

echo "✅ All services stopped"
echo ""

exit $LOAD_TEST_RESULT
