import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-key';

// Generate test tokens
const operatorToken = jwt.sign(
  { userId: 'operator_001', role: 'operator' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const userToken = jwt.sign(
  { userId: 'user_001', role: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Generated Test Tokens:');
console.log('Operator Token:', operatorToken);
console.log('User Token:', userToken);
console.log('\nAPI Endpoints to test:\n');

const baseUrl = 'http://localhost:3000';

const tests = [
  {
    name: 'POST /activities - Create activity (as operator)',
    method: 'POST',
    url: `${baseUrl}/activities`,
    headers: {
      'Authorization': `Bearer ${operatorToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      title: 'Scuba Diving Course',
      description: 'Learn to scuba dive',
      category: 'water-sports',
      price: 299.99,
      duration: 3,
      location: 'Great Barrier Reef',
      maxParticipants: 6,
    },
  },
  {
    name: 'GET /activities/:id - Get activity',
    method: 'GET',
    url: `${baseUrl}/activities/{activity_id}`,
  },
  {
    name: 'PATCH /activities/:id - Update activity (as operator)',
    method: 'PATCH',
    url: `${baseUrl}/activities/{activity_id}`,
    headers: {
      'Authorization': `Bearer ${operatorToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      price: 349.99,
    },
  },
  {
    name: 'DELETE /activities/:id - Delete activity (as operator)',
    method: 'DELETE',
    url: `${baseUrl}/activities/{activity_id}`,
    headers: {
      'Authorization': `Bearer ${operatorToken}`,
    },
  },
  {
    name: 'POST /activities - Fail as non-operator',
    method: 'POST',
    url: `${baseUrl}/activities`,
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: {
      title: 'Beach Volleyball',
      description: 'Play beach volleyball',
      category: 'sports',
      price: 49.99,
      duration: 2,
      location: 'Malibu Beach',
      maxParticipants: 10,
    },
    expectedError: 'Only operators can perform this action',
  },
  {
    name: 'GET /activities/search - Full-text search',
    method: 'GET',
    url: `${baseUrl}/activities/search?search=scuba`,
  },
  {
    name: 'GET /activities/search - Filter by category',
    method: 'GET',
    url: `${baseUrl}/activities/search?category=water-sports`,
  },
  {
    name: 'GET /activities/search - Filter by location',
    method: 'GET',
    url: `${baseUrl}/activities/search?location=Great%20Barrier%20Reef`,
  },
  {
    name: 'GET /activities/search - Filter by price range',
    method: 'GET',
    url: `${baseUrl}/activities/search?minPrice=50&maxPrice=300`,
  },
  {
    name: 'GET /activities/search - Sort by price ascending',
    method: 'GET',
    url: `${baseUrl}/activities/search?sortBy=price&sortOrder=asc`,
  },
  {
    name: 'GET /activities/search - With pagination',
    method: 'GET',
    url: `${baseUrl}/activities/search?limit=5&offset=0`,
  },
  {
    name: 'GET /activities/search - Combined filters',
    method: 'GET',
    url: `${baseUrl}/activities/search?search=diving&category=water-sports&maxPrice=400&limit=10&sortBy=price&sortOrder=asc`,
  },
];

console.log('Test Cases:');
tests.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.name}`);
  console.log(`   ${test.method} ${test.url}`);
  if (test.body) {
    console.log(`   Body: ${JSON.stringify(test.body, null, 2)}`);
  }
  if (test.expectedError) {
    console.log(`   Expected Error: ${test.expectedError}`);
  }
});

console.log('\n\nTo run these tests:');
console.log('1. Start the server: npm run dev');
console.log('2. In another terminal, run curl commands like:');
console.log(`\ncurl -X POST http://localhost:3000/activities \\
  -H "Authorization: Bearer ${operatorToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Scuba Diving Course",
    "description": "Learn to scuba dive",
    "category": "water-sports",
    "price": 299.99,
    "duration": 3,
    "location": "Great Barrier Reef",
    "maxParticipants": 6
  }'\n`);

console.log('\n\nSearch & Filter Examples:');
console.log(`\n# Full-text search
curl "${baseUrl}/activities/search?search=scuba"

# Filter by category
curl "${baseUrl}/activities/search?category=water-sports"

# Filter by location
curl "${baseUrl}/activities/search?location=Great%20Barrier%20Reef"

# Filter by price range (50-300)
curl "${baseUrl}/activities/search?minPrice=50&maxPrice=300"

# Sort by price ascending
curl "${baseUrl}/activities/search?sortBy=price&sortOrder=asc"

# Pagination (5 items per page)
curl "${baseUrl}/activities/search?limit=5&offset=0"

# Combined: search diving in water-sports under 400, sorted by price
curl "${baseUrl}/activities/search?search=diving&category=water-sports&maxPrice=400&sortBy=price&sortOrder=asc&limit=10"
\n`);
