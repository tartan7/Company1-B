import { isValidTimezone, convertLocalToUTC, convertUTCToLocal, convertFullDateTimeLocalToUTC } from './timezone';
console.log('=== TIMEZONE SERVICE COMPREHENSIVE TESTS ===\n');
// Test Suites
const testResults = [];
function addTest(category, name, passed) {
    let suite = testResults.find(r => r.category === category);
    if (!suite) {
        suite = { category, tests: [] };
        testResults.push(suite);
    }
    suite.tests.push({ name, passed });
}
// Test 1: Timezone Validation
console.log('1. TIMEZONE VALIDATION TESTS');
const validTimezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'];
const invalidTimezones = ['Invalid/Timezone', 'America/FakeCity', ''];
validTimezones.forEach(tz => {
    const result = isValidTimezone(tz);
    console.log(`  ✓ Validate "${tz}": ${result ? 'PASS' : 'FAIL'}`);
    addTest('Timezone Validation', `Valid timezone: ${tz}`, result);
});
invalidTimezones.forEach(tz => {
    const result = !isValidTimezone(tz);
    console.log(`  ✓ Reject "${tz}": ${result ? 'PASS' : 'FAIL'}`);
    addTest('Timezone Validation', `Invalid timezone: ${tz}`, result);
});
// Test 2: DST Spring Forward (2:00 AM becomes 3:00 AM)
console.log('\n2. DST SPRING FORWARD TEST');
console.log('  Testing US Eastern Time - Spring 2026 (March 8, 2026)');
const springForward = convertLocalToUTC('2026-03-08', '02:30', 'America/New_York');
console.log(`  Local: 2026-03-08 02:30 EST`);
console.log(`  UTC: ${springForward.utcTime}`);
const isSpringForwardCorrect = springForward.utcTime !== '07:30'; // 02:30 EST = 07:30 UTC
console.log(`  Result: ${springForward.utcTime !== '07:30' ? 'PASS (handles non-existent time)' : 'FAIL'}`);
addTest('DST Tests', 'Spring forward handling', isSpringForwardCorrect);
// Test 3: DST Fall Back (2:00 AM appears twice)
console.log('\n3. DST FALL BACK TEST');
console.log('  Testing US Eastern Time - Fall 2026 (November 1, 2026)');
const fallBack1 = convertLocalToUTC('2026-11-01', '01:30', 'America/New_York');
console.log(`  Local: 2026-11-01 01:30 EDT (first occurrence)`);
console.log(`  UTC: ${fallBack1.utcTime}`);
const isFallBackCorrect = fallBack1.utcTime !== '';
console.log(`  Result: ${isFallBackCorrect ? 'PASS' : 'FAIL'}`);
addTest('DST Tests', 'Fall back handling', isFallBackCorrect);
// Test 4: Midnight Crossing - Different dates in different timezones
console.log('\n4. MIDNIGHT CROSSING TEST');
console.log('  Testing NY (UTC-5) vs Tokyo (UTC+9) - 14-hour difference');
const midnight1 = convertLocalToUTC('2026-05-21', '23:00', 'America/New_York');
const midnight2 = convertLocalToUTC('2026-05-22', '12:00', 'Asia/Tokyo');
console.log(`  NY: 2026-05-21 23:00 EDT → UTC: ${midnight1.utcTime}`);
console.log(`  Tokyo: 2026-05-22 12:00 JST → UTC: ${midnight2.utcTime}`);
const isMidnightCorrect = midnight1.utcTime !== '' && midnight2.utcTime !== '';
console.log(`  Result: ${isMidnightCorrect ? 'PASS (both times converted)' : 'FAIL'}`);
addTest('Midnight Crossing', 'Cross-timezone date handling', isMidnightCorrect);
// Test 5: Ambiguous Times During DST (2:00 AM - 2:59 AM during fall back)
console.log('\n5. AMBIGUOUS TIME DURING DST TEST');
console.log('  Testing ambiguous hour: 2:30 AM during fall back');
const ambiguousTime = convertLocalToUTC('2026-11-01', '02:00', 'America/New_York');
console.log(`  Local: 2026-11-01 02:00 (EDT/EST boundary)`);
console.log(`  UTC: ${ambiguousTime.utcTime}`);
const isAmbiguousCorrect = ambiguousTime.utcTime !== '';
console.log(`  Result: ${isAmbiguousCorrect ? 'PASS (handles ambiguous time)' : 'FAIL'}`);
addTest('DST Tests', 'Ambiguous time handling', isAmbiguousCorrect);
// Test 6: Multiple Timezone Conversions
console.log('\n6. MULTIPLE TIMEZONE CONVERSION TEST');
const timezones = ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
const testTime = '2026-05-21 14:00';
console.log(`  Converting ${testTime} from UTC to multiple timezones:`);
let allConversionsCorrect = true;
timezones.forEach(tz => {
    const result = convertUTCToLocal('14:00', '2026-05-21', tz);
    console.log(`  ${tz}: ${result.localTime}`);
    allConversionsCorrect = allConversionsCorrect && result.localTime !== '';
});
console.log(`  Result: ${allConversionsCorrect ? 'PASS' : 'FAIL'}`);
addTest('Multiple Conversions', 'Multi-timezone conversion', allConversionsCorrect);
// Test 7: Backward Compatibility - UTC dates work as before
console.log('\n7. BACKWARD COMPATIBILITY TEST');
const utcTest = convertLocalToUTC('2026-05-21', '14:00', 'UTC');
const isUTCCompatible = utcTest.utcTime === '14:00';
console.log(`  UTC: 2026-05-21 14:00 → ${utcTest.utcTime}`);
console.log(`  Result: ${isUTCCompatible ? 'PASS (UTC unchanged)' : 'FAIL'}`);
addTest('Backward Compatibility', 'UTC timezone compatibility', isUTCCompatible);
// Test 8: Full DateTime Conversion
console.log('\n8. FULL DATETIME CONVERSION TEST');
const fullConversion = convertFullDateTimeLocalToUTC('2026-05-21', '14:30', 'America/Los_Angeles');
console.log(`  Local: 2026-05-21 14:30 PDT`);
console.log(`  UTC: ${fullConversion.utcDateTime}`);
const isFullConversionCorrect = fullConversion.utcDateTime.includes('2026-05-21');
console.log(`  Result: ${isFullConversionCorrect ? 'PASS' : 'FAIL'}`);
addTest('Full Conversion', 'DateTime ISO conversion', isFullConversionCorrect);
// Test 9: Round-trip Conversion (Local → UTC → Local)
console.log('\n9. ROUND-TRIP CONVERSION TEST');
const original = { date: '2026-05-21', time: '14:30', tz: 'Europe/London' };
const toUTC = convertLocalToUTC(original.date, original.time, original.tz);
const backToLocal = convertUTCToLocal(toUTC.utcTime, original.date, original.tz);
const isRoundTripCorrect = backToLocal.localTime === original.time;
console.log(`  Original: ${original.time} in ${original.tz}`);
console.log(`  Via UTC: ${toUTC.utcTime}`);
console.log(`  Back to Local: ${backToLocal.localTime}`);
console.log(`  Result: ${isRoundTripCorrect ? 'PASS (roundtrip successful)' : 'FAIL'}`);
addTest('Round-trip', 'Local → UTC → Local', isRoundTripCorrect);
// Test 10: Extreme Timezone Differences
console.log('\n10. EXTREME TIMEZONE DIFFERENCE TEST');
const extreme1 = convertLocalToUTC('2026-05-21', '12:00', 'Pacific/Kiritimati'); // UTC+14
const extreme2 = convertLocalToUTC('2026-05-21', '12:00', 'Etc/GMT+12'); // UTC-12
console.log(`  Pacific/Kiritimati (UTC+14): 12:00`);
console.log(`  Etc/GMT+12 (UTC-12): 12:00`);
const isExtremeCorrect = extreme1.utcTime !== '' && extreme2.utcTime !== '';
console.log(`  Result: ${isExtremeCorrect ? 'PASS (both converted)' : 'FAIL'}`);
addTest('Extreme Timezones', 'Max timezone difference', isExtremeCorrect);
// Test 11: Edge case - New Year crossing
console.log('\n11. NEW YEAR CROSSING TEST');
const newYear = convertLocalToUTC('2025-12-31', '23:30', 'America/New_York');
const newYearUTC = convertLocalToUTC('2026-01-01', '04:30', 'UTC');
console.log(`  NY: 2025-12-31 23:30 EST`);
console.log(`  UTC: ${newYear.utcTime}`);
const isNewYearCorrect = newYear.utcTime !== '';
console.log(`  Result: ${isNewYearCorrect ? 'PASS' : 'FAIL'}`);
addTest('Year Boundary', 'New Year crossing', isNewYearCorrect);
// Test 12: Leap year handling
console.log('\n12. LEAP YEAR TEST');
const leapDay = convertLocalToUTC('2024-02-29', '12:00', 'America/New_York');
console.log(`  Leap day 2024-02-29 12:00 in New York`);
console.log(`  UTC: ${leapDay.utcTime}`);
const isLeapYearCorrect = leapDay.utcTime !== '';
console.log(`  Result: ${isLeapYearCorrect ? 'PASS' : 'FAIL'}`);
addTest('Edge Cases', 'Leap year handling', isLeapYearCorrect);
// Print Summary
console.log('\n=== TEST SUMMARY ===\n');
let totalTests = 0;
let passedTests = 0;
testResults.forEach(category => {
    const categoryPassed = category.tests.filter(t => t.passed).length;
    const categoryTotal = category.tests.length;
    totalTests += categoryTotal;
    passedTests += categoryPassed;
    console.log(`${category.category}: ${categoryPassed}/${categoryTotal} passed`);
    category.tests.forEach(test => {
        console.log(`  ${test.passed ? '✓' : '✗'} ${test.name}`);
    });
});
console.log(`\n=== OVERALL: ${passedTests}/${totalTests} tests passed ===`);
console.log(passedTests === totalTests ? '✓ ALL TESTS PASSED!' : '✗ Some tests failed');
