#!/bin/bash

set -e

WORKSPACE_DIR="/paperclip/instances/default/workspaces/c5376712-feaf-462e-acad-91f1949f55f0"
RESULTS_FILE="$WORKSPACE_DIR/peak-load-test-results-1000.json"
LOG_FILE="$WORKSPACE_DIR/peak-load-test-1000.log"

echo "═══════════════════════════════════════════════════════════════"
echo "     1000-USER PEAK LOAD TEST - SERVICE STABILITY VALIDATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Start mock services
echo "🚀 Starting mock services..."
cd "$WORKSPACE_DIR"
node mock-services.js > /tmp/mock-services.log 2>&1 &
MOCK_SERVICES_PID=$!

# Wait for services to start
echo "⏳ Waiting for mock services to be ready..."
sleep 2

# Health check
all_ready=true
for port in 3001 3002 3003 3004; do
  for attempt in {1..10}; do
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
      echo "✅ Service on port $port is ready"
      break
    else
      if [ $attempt -eq 10 ]; then
        echo "❌ Service on port $port failed to start"
        all_ready=false
      else
        sleep 0.5
      fi
    fi
  done
done

if [ "$all_ready" = false ]; then
  echo ""
  echo "❌ Some services failed to start. Mock service log:"
  tail -20 /tmp/mock-services.log
  kill $MOCK_SERVICES_PID 2>/dev/null || true
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "        EXECUTING 1000-USER PEAK LOAD TEST"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run the load test and save output
cd "$WORKSPACE_DIR"
node load-test-1000-peak.js 2>&1 | tee "$LOG_FILE"

LOAD_TEST_RESULT=$?

# Cleanup
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "             CLEANUP - STOPPING MOCK SERVICES"
echo "═══════════════════════════════════════════════════════════════"

kill $MOCK_SERVICES_PID 2>/dev/null || true
sleep 1

echo "✅ All mock services stopped"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Test results saved to: $LOG_FILE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

exit $LOAD_TEST_RESULT
