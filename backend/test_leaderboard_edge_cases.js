const http = require('http');

const testCases = [
  {
    name: 'Test invalid page parameter (negative)',
    url: 'http://localhost:8080/api/leaderboard?page=-1&limit=5',
    expectedStatus: 200, // Should default to page 1
    description: 'Negative page should default to page 1'
  },
  {
    name: 'Test invalid limit parameter (too high)',
    url: 'http://localhost:8080/api/leaderboard?page=1&limit=1000',
    expectedStatus: 200, // Should use default limit
    description: 'Large limit should be accepted but may be capped by server'
  },
  {
    name: 'Test invalid limit parameter (negative)',
    url: 'http://localhost:8080/api/leaderboard?page=1&limit=-5',
    expectedStatus: 200, // Should default to limit 20
    description: 'Negative limit should default to limit 20'
  },
  {
    name: 'Test no parameters',
    url: 'http://localhost:8080/api/leaderboard',
    expectedStatus: 200,
    description: 'No parameters should use defaults (page=1, limit=20)'
  },
  {
    name: 'Test page beyond total pages',
    url: 'http://localhost:8080/api/leaderboard?page=100&limit=5',
    expectedStatus: 200,
    description: 'Page beyond total should return empty users array'
  }
];

function runTest(testCase) {
  return new Promise((resolve) => {
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    
    const req = http.get(testCase.url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status Code: ${res.statusCode} (expected: ${testCase.expectedStatus})`);
        
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === testCase.expectedStatus) {
            console.log('   ✅ Status code matches expected');
            
            // Additional validation based on test case
            if (testCase.name.includes('page beyond total')) {
              if (response.users.length === 0) {
                console.log('   ✅ Empty users array for out-of-bounds page');
              } else {
                console.log('   ⚠️  Users returned for out-of-bounds page');
              }
            }
            
            if (response.hasOwnProperty('users') && 
                response.hasOwnProperty('total') && 
                response.hasOwnProperty('page') && 
                response.hasOwnProperty('limit') && 
                response.hasOwnProperty('pages')) {
              console.log('   ✅ Response format is correct');
            } else {
              console.log('   ❌ Missing required response fields');
            }
            
          } else {
            console.log('   ❌ Status code does not match expected');
          }
          
        } catch (error) {
          console.log('   ❌ Failed to parse JSON response');
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log('   ❌ Request failed:', error.message);
      resolve();
    });
    
    req.end();
  });
}

async function runAllTests() {
  console.log('🚀 Starting leaderboard edge case tests...');
  
  for (const testCase of testCases) {
    await runTest(testCase);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n🎯 All edge case tests completed!');
}

runAllTests();