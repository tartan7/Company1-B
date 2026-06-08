import { ActivityService } from './src/services/activityService';
import { CreateActivityInput } from './src/types/activity';

// Test activity data
const testActivity: CreateActivityInput = {
  title: 'Mountain Hiking Tour',
  description: 'A scenic mountain hiking experience',
  category: 'adventure',
  price: 99.99,
  duration: 4,
  location: 'Rocky Mountains',
  maxParticipants: 10,
};

const operatorId = 'operator_001';

console.log('Testing Activity CRUD Operations...\n');

// Test CREATE
console.log('1. CREATE - Creating new activity');
const activity = ActivityService.createActivity(testActivity, operatorId);
console.log(`✓ Activity created with ID: ${activity.id}`);
console.log(`  Title: ${activity.title}`);
console.log(`  Price: $${activity.price}`);
console.log(`  Operator: ${activity.operatorId}\n`);

// Test READ
console.log('2. READ - Fetching activity by ID');
const fetched = ActivityService.getActivity(activity.id);
console.log(`✓ Activity retrieved: ${fetched?.title}`);
console.log(`  Duration: ${fetched?.duration} hours\n`);

// Test UPDATE
console.log('3. UPDATE - Updating activity');
const updated = ActivityService.updateActivity(activity.id, { price: 129.99 }, operatorId);
console.log(`✓ Activity updated`);
console.log(`  New price: $${updated?.price}\n`);

// Test UPDATE with wrong operator (should fail)
console.log('4. UPDATE - Attempting update with different operator (should fail)');
try {
  ActivityService.updateActivity(activity.id, { price: 159.99 }, 'other_operator');
  console.log('✗ ERROR: Should have thrown authorization error');
} catch (error: any) {
  console.log(`✓ Correctly rejected: ${error.message}\n`);
}

// Test DELETE
console.log('5. DELETE - Deleting activity');
const deleted = ActivityService.deleteActivity(activity.id, operatorId);
console.log(`✓ Activity deleted: ${deleted}`);

// Test DELETE non-existent
console.log('\n6. DELETE - Attempting to delete non-existent activity');
const notDeleted = ActivityService.deleteActivity('fake_id', operatorId);
console.log(`✓ Non-existent activity delete returned: ${notDeleted}`);

// Test authorization on delete
console.log('\n7. DELETE - Attempting delete with different operator (should fail)');
const activity2 = ActivityService.createActivity(testActivity, 'operator_002');
try {
  ActivityService.deleteActivity(activity2.id, operatorId);
  console.log('✗ ERROR: Should have thrown authorization error');
} catch (error: any) {
  console.log(`✓ Correctly rejected: ${error.message}\n`);
}

console.log('All tests completed successfully!');
