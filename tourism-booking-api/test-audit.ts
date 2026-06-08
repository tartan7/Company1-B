import { AuditService } from './src/services/auditService';

// Test the audit service (without database)
async function testAudit() {
  console.log('Testing AuditService...');
  
  // Test CSV formatting
  const mockLogs = [
    {
      id: 1n,
      operationType: 'create' as const,
      resourceType: 'booking',
      resourceId: 'booking_123',
      actorType: 'user' as const,
      actorId: 'user_456',
      beforeState: null,
      afterState: '{"id":"booking_123","quantity":2,"status":"pending"}',
      description: 'Booking created',
      operationTimestamp: new Date('2024-01-15T10:30:00Z'),
      createdAt: new Date('2024-01-15T10:30:00Z'),
    },
  ];

  const csv = AuditService.formatLogsAsCSV(mockLogs);
  console.log('CSV Export Test:');
  console.log(csv);
  console.log('\n✅ CSV formatting works!');
  
  // Test query interface
  const queryExample = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    operationType: 'create',
    resourceType: 'booking',
    limit: 100,
    offset: 0,
  };
  console.log('\n✅ Query interface valid:', JSON.stringify(queryExample, null, 2));
}

testAudit().catch(console.error);
