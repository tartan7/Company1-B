import { convertLocalToUTC, convertUTCToLocal, convertFullDateTimeLocalToUTC, isValidTimezone } from './timezone';
console.log('=== TIMEZONE PERFORMANCE TESTS ===\n');
console.log('Performance Requirement: < 5ms per operation\n');
const results = [];
const THRESHOLD_MS = 5;
const ITERATIONS = 1000;
function measurePerformance(name, operation, iterations = ITERATIONS) {
    const times = [];
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        operation();
        const end = performance.now();
        times.push(end - start);
    }
    const totalMs = times.reduce((a, b) => a + b, 0);
    const avgMs = totalMs / iterations;
    const maxMs = Math.max(...times);
    const minMs = Math.min(...times);
    const passed = avgMs < THRESHOLD_MS;
    const result = {
        operation: name,
        iterations,
        totalMs: Math.round(totalMs * 100) / 100,
        avgMs: Math.round(avgMs * 1000) / 1000,
        maxMs: Math.round(maxMs * 1000) / 1000,
        minMs: Math.round(minMs * 1000) / 1000,
        passed,
    };
    results.push(result);
    return result;
}
// Test 1: Timezone Validation Performance
console.log('1. TIMEZONE VALIDATION');
const validationResult = measurePerformance('Validate timezone', () => {
    isValidTimezone('America/New_York');
});
console.log(`  Average: ${validationResult.avgMs}ms (${validationResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${validationResult.minMs}ms, Max: ${validationResult.maxMs}ms`);
// Test 2: Local to UTC Conversion
console.log('\n2. LOCAL TO UTC CONVERSION');
const localToUtcResult = measurePerformance('Convert local → UTC', () => {
    convertLocalToUTC('2026-05-21', '14:30', 'America/New_York');
});
console.log(`  Average: ${localToUtcResult.avgMs}ms (${localToUtcResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${localToUtcResult.minMs}ms, Max: ${localToUtcResult.maxMs}ms`);
// Test 3: UTC to Local Conversion
console.log('\n3. UTC TO LOCAL CONVERSION');
const utcToLocalResult = measurePerformance('Convert UTC → local', () => {
    convertUTCToLocal('14:30', '2026-05-21', 'America/Los_Angeles');
});
console.log(`  Average: ${utcToLocalResult.avgMs}ms (${utcToLocalResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${utcToLocalResult.minMs}ms, Max: ${utcToLocalResult.maxMs}ms`);
// Test 4: Full DateTime Conversion
console.log('\n4. FULL DATETIME CONVERSION');
const fullConversionResult = measurePerformance('Full datetime conversion', () => {
    convertFullDateTimeLocalToUTC('2026-05-21', '14:30', 'Europe/London');
});
console.log(`  Average: ${fullConversionResult.avgMs}ms (${fullConversionResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${fullConversionResult.minMs}ms, Max: ${fullConversionResult.maxMs}ms`);
// Test 5: Round-trip Conversion (Local → UTC → Local)
console.log('\n5. ROUND-TRIP CONVERSION');
const roundTripResult = measurePerformance('Round-trip conversion', () => {
    const utc = convertLocalToUTC('2026-05-21', '14:30', 'Asia/Tokyo');
    convertUTCToLocal(utc.utcTime, '2026-05-21', 'Asia/Tokyo');
});
console.log(`  Average: ${roundTripResult.avgMs}ms (${roundTripResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${roundTripResult.minMs}ms, Max: ${roundTripResult.maxMs}ms`);
// Test 6: Concurrent Timezone Conversions
console.log('\n6. CONCURRENT MULTI-TIMEZONE CONVERSIONS');
const multiTzResult = measurePerformance('Multi-timezone batch', () => {
    const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
    timezones.forEach(tz => {
        convertLocalToUTC('2026-05-21', '14:30', tz);
    });
});
console.log(`  Average (4 timezones): ${multiTzResult.avgMs}ms (${multiTzResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${multiTzResult.minMs}ms, Max: ${multiTzResult.maxMs}ms`);
// Test 7: Different Date Formats
console.log('\n7. DIFFERENT DATE FORMATS');
const dateFormatsResult = measurePerformance('Varied date formats', () => {
    convertLocalToUTC('2026-01-01', '00:00', 'UTC');
    convertLocalToUTC('2026-12-31', '23:59', 'UTC');
    convertLocalToUTC('2026-06-15', '12:00', 'UTC');
});
console.log(`  Average (3 conversions): ${dateFormatsResult.avgMs}ms (${dateFormatsResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${dateFormatsResult.minMs}ms, Max: ${dateFormatsResult.maxMs}ms`);
// Test 8: Edge Case - DST Boundary
console.log('\n8. DST BOUNDARY CONVERSION');
const dstResult = measurePerformance('DST boundary handling', () => {
    convertLocalToUTC('2026-03-08', '02:30', 'America/New_York');
    convertLocalToUTC('2026-11-01', '02:30', 'America/New_York');
});
console.log(`  Average (DST transitions): ${dstResult.avgMs}ms (${dstResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${dstResult.minMs}ms, Max: ${dstResult.maxMs}ms`);
// Test 9: Large Batch Processing
console.log('\n9. LARGE BATCH PROCESSING (100 conversions)');
const batchResult = measurePerformance('Batch processing', () => {
    for (let i = 0; i < 100; i++) {
        const day = Math.floor(i / 4) + 1;
        const tz = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'][i % 4];
        convertLocalToUTC(`2026-05-${String(day).padStart(2, '0')}`, '14:30', tz);
    }
}, 100 // Run fewer iterations for batch test
);
console.log(`  Average (per 100 conversions): ${batchResult.avgMs}ms`);
console.log(`  Min: ${batchResult.minMs}ms, Max: ${batchResult.maxMs}ms`);
console.log(`  Per operation: ${(batchResult.avgMs / 100).toFixed(4)}ms (${(batchResult.avgMs / 100) < THRESHOLD_MS ? '✓ PASS' : '✗ FAIL'})`);
// Test 10: Cache-less Performance (Worst Case)
console.log('\n10. WORST-CASE PERFORMANCE (Random timezones)');
const allTimezones = [
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'America/Denver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Amsterdam',
    'Asia/Tokyo',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
    'America/Mexico_City',
];
const worstCaseResult = measurePerformance('Random timezone conversion', () => {
    const randomTz = allTimezones[Math.floor(Math.random() * allTimezones.length)];
    convertLocalToUTC('2026-05-21', '14:30', randomTz);
});
console.log(`  Average: ${worstCaseResult.avgMs}ms (${worstCaseResult.passed ? '✓ PASS' : '✗ FAIL'})`);
console.log(`  Min: ${worstCaseResult.minMs}ms, Max: ${worstCaseResult.maxMs}ms`);
// Summary
console.log('\n=== PERFORMANCE SUMMARY ===\n');
console.log('Operation Performance Report:');
console.log('Name                              | Avg (ms) | Min (ms) | Max (ms) | Status');
console.log('─'.repeat(80));
results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const name = result.operation.padEnd(30);
    const avg = String(result.avgMs).padStart(8);
    const min = String(result.minMs).padStart(8);
    const max = String(result.maxMs).padStart(8);
    console.log(`${name} | ${avg} | ${min} | ${max} | ${status}`);
});
const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
console.log('\n' + '─'.repeat(80));
console.log(`\nPerformance Threshold: ${THRESHOLD_MS}ms per operation`);
console.log(`Results: ${passedCount}/${totalCount} operations meet performance requirements`);
if (passedCount === totalCount) {
    console.log('\n✓ ALL PERFORMANCE TESTS PASSED!');
}
else {
    console.log('\n✗ Some operations exceed performance threshold');
    results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.operation}: ${r.avgMs}ms (exceeds ${THRESHOLD_MS}ms by ${(r.avgMs - THRESHOLD_MS).toFixed(3)}ms)`);
    });
}
// Additional stats
console.log('\nAdditional Statistics:');
const totalOps = results.reduce((sum, r) => sum + r.iterations, 0);
console.log(`Total operations performed: ${totalOps.toLocaleString()}`);
const avgAll = results.reduce((sum, r) => sum + r.avgMs, 0) / results.length;
console.log(`Overall average latency: ${avgAll.toFixed(3)}ms`);
console.log(`Fastest operation: ${Math.min(...results.map(r => r.avgMs)).toFixed(3)}ms`);
console.log(`Slowest operation: ${Math.max(...results.map(r => r.avgMs)).toFixed(3)}ms`);
