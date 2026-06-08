#!/bin/bash

set -e

WORKSPACE_DIR="/paperclip/instances/default/workspaces/c5376712-feaf-462e-acad-91f1949f55f0"
SERVICES=("faq-bot" "invoice-generator-jp" "seasonal-labor-scheduler" "uptime-monitor")
PORTS=(3001 3002 3003 3004)
PIDS=()

echo "═══════════════════════════════════════════════════════════════"
echo "        1000-USER LOAD TEST - PEAK LOAD VALIDATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Build all services
echo "🔨 Building all services..."
for service in "${SERVICES[@]}"; do
  echo "   Building $service..."
  cd "$WORKSPACE_DIR/services/$service"
  npm install > /dev/null 2>&1 || true
  echo "   Running build..."
  npm run build > /tmp/${service}-build.log 2>&1 || {
    echo "   ❌ Build failed for $service"
    cat /tmp/${service}-build.log
    exit 1
  }
  if [ ! -f "dist/index.js" ]; then
    echo "   ❌ Build failed for $service - dist/index.js not created"
    cat /tmp/${service}-build.log
    exit 1
  fi
  echo "   ✅ $service built successfully"
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "             STARTING SERVICES FOR 1000-USER LOAD TEST"
echo "═══════════════════════════════════════════════════════════════"
echo ""

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
echo "⏳ Waiting for all services to become ready..."
sleep 3

# Check health
all_ready=true
for i in "${!SERVICES[@]}"; do
  service="${SERVICES[$i]}"
  port="${PORTS[$i]}"

  for attempt in {1..10}; do
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
      echo "✅ $service is ready on port $port"
      break
    else
      if [ $attempt -eq 10 ]; then
        echo "❌ $service failed to start"
        all_ready=false
      else
        echo "   Attempt $attempt/10: waiting for $service..."
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
    echo "--- $service log (last 30 lines) ---"
    tail -30 "/tmp/$service.log" 2>/dev/null || echo "No log available"
  done

  # Cleanup
  for pid in "${PIDS[@]}"; do
    kill $pid 2>/dev/null || true
  done
  exit 1
fi

echo ""
echo "✅ All services are running and healthy"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "        EXECUTING 1000-USER LOAD TEST - PEAK LOAD VALIDATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run the load test
cd "$WORKSPACE_DIR"
node load-test.js

LOAD_TEST_RESULT=$?

# Cleanup
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "             CLEANUP - STOPPING ALL SERVICES"
echo "═══════════════════════════════════════════════════════════════"

for pid in "${PIDS[@]}"; do
  kill $pid 2>/dev/null || true
done

wait ${PIDS[@]} 2>/dev/null || true

echo "✅ All services have been stopped"
echo ""

exit $LOAD_TEST_RESULT
