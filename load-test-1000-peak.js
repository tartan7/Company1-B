import http from 'http';

// Configuration for 1000-user peak load test
const CONCURRENT_USERS = 1000;
const REQUESTS_PER_USER = 10;
const REQUEST_TIMEOUT = 30000;
const TEST_DURATION_MS = 60000; // 60 second test

// Services configuration
const services = [
  { name: 'faq-bot', port: 3001, endpoint: '/health' },
  { name: 'invoice-generator-jp', port: 3002, endpoint: '/health' },
  { name: 'seasonal-labor-scheduler', port: 3003, endpoint: '/health' },
  { name: 'uptime-monitor', port: 3004, endpoint: '/health' },
];

// LoadTestResult structure:
// {
//   service: string,
//   totalRequests: number,
//   successfulRequests: number,
//   failedRequests: number,
//   averageResponseTime: number,
//   minResponseTime: number,
//   maxResponseTime: number,
//   p50ResponseTime: number,
//   p95ResponseTime: number,
//   p99ResponseTime: number,
//   errorRate: number,
//   requestsPerSecond: number,
//   errors: object<string, number>,
//   statusCodes: object<number, number>,
//   stability: 'STABLE' | 'DEGRADED' | 'FAILED'
// }

function makeRequest(url, timeout = REQUEST_TIMEOUT) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const protocol = http;

    const request = protocol.get(url, { timeout }, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          responseTime,
          error: null,
        });
      });
    });

    request.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        statusCode: 0,
        responseTime,
        error: error.message,
      });
    });

    request.on('timeout', () => {
      request.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        statusCode: 0,
        responseTime,
        error: 'TIMEOUT',
      });
    });
  });
}

function calculatePercentile(sortedArray, percentile) {
  const index = Math.ceil(sortedArray.length * (percentile / 100)) - 1;
  return sortedArray[Math.max(0, index)];
}

async function loadTest(service) {
  console.log(`\n🔧 Starting peak load test for ${service.name}...`);
  console.log(`   Target: http://localhost:${service.port}${service.endpoint}`);
  console.log(`   Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`   Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`   Total Expected Requests: ${CONCURRENT_USERS * REQUESTS_PER_USER}`);

  const url = `http://localhost:${service.port}${service.endpoint}`;
  const results = [];
  const responseTimes = [];
  const statusCodes = {};
  const errors = {};
  let successCount = 0;
  let failureCount = 0;

  const startTime = Date.now();

  // Simulate 1000 concurrent users, each making 10 requests
  const allRequests = [];
  for (let user = 0; user < CONCURRENT_USERS; user++) {
    for (let request = 0; request < REQUESTS_PER_USER; request++) {
      allRequests.push(
        makeRequest(url).then((result) => {
          responseTimes.push(result.responseTime);

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            if (result.error) {
              errors[result.error] = (errors[result.error] || 0) + 1;
            }
          }

          statusCodes[result.statusCode] = (statusCodes[result.statusCode] || 0) + 1;
          results.push(result);

          // Log progress every 1000 requests
          if (results.length % 1000 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const avgRt = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0);
            console.log(`   Progress: ${results.length}/${CONCURRENT_USERS * REQUESTS_PER_USER} requests | Avg RT: ${avgRt}ms | Elapsed: ${elapsed}s`);
          }
        })
      );
    }
  }

  // Execute all requests concurrently
  await Promise.all(allRequests);
  const totalTime = Date.now() - startTime;
  const totalRequests = successCount + failureCount;

  // Calculate statistics
  responseTimes.sort((a, b) => a - b);
  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = responseTimes[0];
  const maxResponseTime = responseTimes[responseTimes.length - 1];
  const p50ResponseTime = calculatePercentile(responseTimes, 50);
  const p95ResponseTime = calculatePercentile(responseTimes, 95);
  const p99ResponseTime = calculatePercentile(responseTimes, 99);

  const errorRate = (failureCount / totalRequests) * 100;
  const requestsPerSecond = totalRequests / (totalTime / 1000);

  // Determine stability
  let stability = 'STABLE';
  if (errorRate > 1) {
    stability = 'DEGRADED';
  }
  if (errorRate > 5 || failureCount > 0) {
    stability = 'FAILED';
  }

  const result = {
    service: service.name,
    totalRequests,
    successfulRequests: successCount,
    failedRequests: failureCount,
    averageResponseTime: Math.round(averageResponseTime),
    minResponseTime,
    maxResponseTime,
    p50ResponseTime: Math.round(p50ResponseTime),
    p95ResponseTime: Math.round(p95ResponseTime),
    p99ResponseTime: Math.round(p99ResponseTime),
    errorRate: errorRate.toFixed(3),
    requestsPerSecond: requestsPerSecond.toFixed(2),
    errors,
    statusCodes,
    stability,
  };

  return result;
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     1000-USER PEAK LOAD TEST - SERVICE STABILITY VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('🎯 Test Goals:');
  console.log('   ✓ Validate all services handle 1000 concurrent users');
  console.log('   ✓ Measure response time percentiles (P50, P95, P99)');
  console.log('   ✓ Identify error rates and failure modes');
  console.log('   ✓ Confirm stability at peak load');
  console.log('');

  const allResults = [];
  const overallStartTime = Date.now();

  for (const service of services) {
    try {
      const result = await loadTest(service);
      allResults.push(result);
      console.log(`\n✅ Completed: ${service.name}`);
    } catch (error) {
      console.error(`\n❌ Failed to load test ${service.name}:`, error);
      allResults.push({
        service: service.name,
        totalRequests: 0,
        error: String(error),
      });
    }
  }

  const overallTime = Date.now() - overallStartTime;

  // Print detailed results
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                     DETAILED RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  allResults.forEach((result) => {
    if (result.error) {
      console.log(`\n❌ ${result.service}`);
      console.log(`   Error: ${result.error}`);
      return;
    }

    const statusEmoji = result.stability === 'STABLE' ? '✅' : result.stability === 'DEGRADED' ? '⚠️' : '❌';

    console.log(`\n${statusEmoji} ${result.service} [${result.stability}]`);
    console.log(`   Total Requests:      ${result.totalRequests}`);
    console.log(`   Successful:          ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`   Failed:              ${result.failedRequests}`);
    console.log(`   Error Rate:          ${result.errorRate}%`);
    console.log(`\n   Response Time (ms):`);
    console.log(`   - Min:               ${result.minResponseTime}ms`);
    console.log(`   - P50 (Median):      ${result.p50ResponseTime}ms`);
    console.log(`   - P95:               ${result.p95ResponseTime}ms`);
    console.log(`   - P99:               ${result.p99ResponseTime}ms`);
    console.log(`   - Max:               ${result.maxResponseTime}ms`);
    console.log(`   - Average:           ${result.averageResponseTime}ms`);
    console.log(`\n   Throughput:          ${result.requestsPerSecond} req/s`);

    if (Object.keys(result.statusCodes).length > 0) {
      console.log(`\n   Status Codes:`);
      Object.entries(result.statusCodes)
        .sort()
        .forEach(([code, count]) => {
          console.log(`   - ${code}: ${count}`);
        });
    }

    if (Object.keys(result.errors).length > 0) {
      console.log(`\n   Errors:`);
      Object.entries(result.errors).forEach(([error, count]) => {
        console.log(`   - ${error}: ${count}`);
      });
    }
  });

  // Validation against peak load targets
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('              PEAK LOAD TARGET VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const peakLoadTargets = {
    maxErrorRate: 0.1, // < 0.1%
    maxP99ResponseTime: 5000, // < 5000ms
    maxP95ResponseTime: 3000, // < 3000ms
    minSuccessRate: 99.9, // > 99.9%
  };

  console.log('Success Criteria:');
  console.log(`  • Error Rate: < ${peakLoadTargets.maxErrorRate}%`);
  console.log(`  • P99 Response Time: < ${peakLoadTargets.maxP99ResponseTime}ms`);
  console.log(`  • P95 Response Time: < ${peakLoadTargets.maxP95ResponseTime}ms`);
  console.log(`  • Success Rate: > ${peakLoadTargets.minSuccessRate}%\n`);

  let allServicesValid = true;
  allResults.forEach((result) => {
    if (result.error) {
      console.log(`\n❌ ${result.service}: SERVICE UNREACHABLE`);
      console.log(`   Status: FAILED - Cannot test unreachable service`);
      allServicesValid = false;
      return;
    }

    const errorRate = parseFloat(result.errorRate);
    const successRate = 100 - errorRate;
    const p99 = result.p99ResponseTime;
    const p95 = result.p95ResponseTime;

    const errorRateValid = errorRate <= peakLoadTargets.maxErrorRate;
    const p99Valid = p99 <= peakLoadTargets.maxP99ResponseTime;
    const p95Valid = p95 <= peakLoadTargets.maxP95ResponseTime;
    const successValid = successRate >= peakLoadTargets.minSuccessRate;

    const allValid = errorRateValid && p99Valid && p95Valid && successValid;

    console.log(`\n${allValid ? '✅' : '❌'} ${result.service}`);
    console.log(`   Error Rate:          ${result.errorRate}% ${errorRateValid ? '✓' : '✗ (target: <0.1%)'}`);
    console.log(`   Success Rate:        ${successRate.toFixed(3)}% ${successValid ? '✓' : '✗ (target: >99.9%)'}`);
    console.log(`   P99 Response Time:   ${p99}ms ${p99Valid ? '✓' : '✗ (target: <5000ms)'}`);
    console.log(`   P95 Response Time:   ${p95}ms ${p95Valid ? '✓' : '✗ (target: <3000ms)'}`);

    if (!allValid) {
      allServicesValid = false;
    }
  });

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                        SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Total test duration: ${(overallTime / 1000).toFixed(1)}s`);
  console.log(`Services tested: ${allResults.length}`);
  console.log(`Peak load level: 1000 concurrent users`);
  console.log('');

  if (allServicesValid) {
    console.log('✅ ALL PEAK LOAD TARGETS VALIDATED');
    console.log('   All services remain stable at 1000 concurrent users');
    console.log('   Ready for production deployment');
  } else {
    console.log('❌ PEAK LOAD TARGETS NOT MET');
    console.log('   Some services failed validation');
    console.log('   Further optimization required before production');
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  process.exit(allServicesValid ? 0 : 1);
}

// Start the test
runAllTests().catch(console.error);
