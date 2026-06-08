import http from 'http';
import https from 'https';

const CONCURRENT_USERS = 1000;
const REQUESTS_PER_USER = 10;
const REQUEST_TIMEOUT = 30000;

const services = [
  { name: 'faq-bot', port: 3001, endpoint: '/health' },
  { name: 'invoice-generator-jp', port: 3002, endpoint: '/health' },
  { name: 'seasonal-labor-scheduler', port: 3003, endpoint: '/health' },
  { name: 'uptime-monitor', port: 3004, endpoint: '/health' },
];

interface LoadTestResult {
  service: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  errors: Record<string, number>;
  statusCodes: Record<number, number>;
}

function makeRequest(url, timeout = REQUEST_TIMEOUT) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;

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

async function loadTest(service) {
  console.log(`\n🔧 Starting load test for ${service.name}...`);
  console.log(`   Target: http://localhost:${service.port}${service.endpoint}`);
  console.log(`   Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`   Requests per User: ${REQUESTS_PER_USER}`);

  const url = `http://localhost:${service.port}${service.endpoint}`;
  const results = [];
  const responseTimes = [];
  const statusCodes = {};
  const errors = {};
  let successCount = 0;
  let failureCount = 0;

  const startTime = Date.now();

  // Simulate 500 concurrent users, each making 10 requests
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

          // Log progress every 500 requests
          if (results.length % 500 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`   Progress: ${results.length}/${CONCURRENT_USERS * REQUESTS_PER_USER} requests (${elapsed}s)`);
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
  const p99Index = Math.ceil(responseTimes.length * 0.99) - 1;
  const p99ResponseTime = responseTimes[Math.max(0, p99Index)];

  const errorRate = (failureCount / totalRequests) * 100;
  const requestsPerSecond = totalRequests / (totalTime / 1000);

  const result = {
    service: service.name,
    totalRequests,
    successfulRequests: successCount,
    failedRequests: failureCount,
    averageResponseTime: Math.round(averageResponseTime),
    minResponseTime,
    maxResponseTime,
    p99ResponseTime,
    errorRate: errorRate.toFixed(2),
    requestsPerSecond: requestsPerSecond.toFixed(2),
    errors,
    statusCodes,
  };

  return result;
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        1000-USER LOAD TEST - PEAK LOAD VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════');

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

    console.log(`\n📊 ${result.service}`);
    console.log(`   Total Requests:      ${result.totalRequests}`);
    console.log(`   Successful:          ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`   Failed:              ${result.failedRequests}`);
    console.log(`   Error Rate:          ${result.errorRate}%`);
    console.log(`\n   Response Time (ms):`);
    console.log(`   - Average:           ${result.averageResponseTime}ms`);
    console.log(`   - Min:               ${result.minResponseTime}ms`);
    console.log(`   - Max:               ${result.maxResponseTime}ms`);
    console.log(`   - P99:               ${result.p99ResponseTime}ms`);
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

  // Identify stress points
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                    STRESS POINT ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  allResults.forEach((result) => {
    if (result.error) {
      console.log(`\n⚠️  ${result.service}: SERVICE UNREACHABLE`);
      return;
    }

    const issues = [];
    const errorRate = parseFloat(result.errorRate);

    if (errorRate > 5) {
      issues.push(`High error rate: ${result.errorRate}%`);
    }

    if (result.averageResponseTime > 1000) {
      issues.push(`Slow average response: ${result.averageResponseTime}ms`);
    }

    if (result.maxResponseTime > 5000) {
      issues.push(`High max response time: ${result.maxResponseTime}ms`);
    }

    if (result.p99ResponseTime > 3000) {
      issues.push(`High P99 response time: ${result.p99ResponseTime}ms`);
    }

    if (parseFloat(result.requestsPerSecond) < 50) {
      issues.push(`Low throughput: ${result.requestsPerSecond} req/s`);
    }

    if (issues.length === 0) {
      console.log(`✅ ${result.service}: No stress detected`);
    } else {
      console.log(`⚠️  ${result.service}: STRESS DETECTED`);
      issues.forEach((issue) => {
        console.log(`   - ${issue}`);
      });
    }
  });

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log(`Total test duration: ${(overallTime / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Start the test
runAllTests().catch(console.error);
