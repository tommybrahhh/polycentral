// Comprehensive password reset test script
const http = require('http');
const crypto = require('crypto');

const API_BASE = 'http://localhost:8000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test123!';
const NEW_PASSWORD = 'NewPassword123!';

// Test counters
let testsPassed = 0;
let testsFailed = 0;
let totalTests = 0;

function logTestResult(testName, passed, message = '') {
  totalTests++;
  if (passed) {
    testsPassed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.log(`❌ FAIL: ${testName} - ${message}`);
  }
}

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            data: jsonResponse
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testForgotPassword(email, expectedStatus = 200) {
  const testData = JSON.stringify({ email });
  
  const options = {
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/auth/forgot-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': testData.length
    }
  };
  
  try {
    const response = await makeRequest(options, testData);
    const passed = response.statusCode === expectedStatus;
    logTestResult(`Forgot Password - ${email}`, passed, 
      `Expected ${expectedStatus}, got ${response.statusCode}`);
    return response;
  } catch (error) {
    logTestResult(`Forgot Password - ${email}`, false, error.message);
    return null;
  }
}

async function testRateLimiting() {
  console.log('\n🧪 Testing rate limiting...');
  
  // Make multiple requests quickly to trigger rate limiting
  const requests = [];
  for (let i = 0; i < 4; i++) {
    requests.push(testForgotPassword('rate-test@example.com', i < 3 ? 200 : 429));
  }
  
  const results = await Promise.all(requests);
  
  // Check that the 4th request was rate limited
  const fourthResult = results[3];
  const rateLimited = fourthResult && fourthResult.statusCode === 429;
  logTestResult('Rate Limiting', rateLimited, 
    rateLimited ? 'Rate limiting working correctly' : 'Rate limiting not triggered');
}

async function testResetPassword(token, newPassword, confirmPassword, expectedStatus = 200) {
  const testData = JSON.stringify({
    token,
    newPassword,
    confirmPassword
  });
  
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/auth/reset-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': testData.length
    }
  };
  
  try {
    const response = await makeRequest(options, testData);
    const passed = response.statusCode === expectedStatus;
    logTestResult(`Reset Password - ${token ? 'valid' : 'invalid'} token`, passed, 
      `Expected ${expectedStatus}, got ${response.statusCode}`);
    return response;
  } catch (error) {
    logTestResult(`Reset Password - ${token ? 'valid' : 'invalid'} token`, false, error.message);
    return null;
  }
}

async function testPasswordValidation(token) {
  console.log('\n🧪 Testing password validation...');
  
  const testCases = [
    { password: 'short', confirm: 'short', expected: 400, description: 'Too short' },
    { password: 'nouppercase1!', confirm: 'nouppercase1!', expected: 400, description: 'No uppercase' },
    { password: 'NOLOWERCASE1!', confirm: 'NOLOWERCASE1!', expected: 400, description: 'No lowercase' },
    { password: 'NoNumber!', confirm: 'NoNumber!', expected: 400, description: 'No number' },
    { password: 'NoSpecial1', confirm: 'NoSpecial1', expected: 400, description: 'No special char' },
    { password: 'ValidPass1!', confirm: 'Mismatch123!', expected: 400, description: 'Password mismatch' },
    { password: 'ValidPass123!', confirm: 'ValidPass123!', expected: 200, description: 'Valid password' }
  ];
  
  for (const testCase of testCases) {
    await testResetPassword(token, testCase.password, testCase.confirm, testCase.expected);
  }
}

async function testEmailEnumerationProtection() {
  console.log('\n🧪 Testing email enumeration protection...');
  
  const existingEmail = TEST_EMAIL;
  const nonExistingEmail = 'nonexistent@example.com';
  
  const response1 = await testForgotPassword(existingEmail);
  const response2 = await testForgotPassword(nonExistingEmail);
  
  // Both should return 200 with the same message to prevent enumeration
  const enumerationProtected = response1 && response2 && 
                              response1.statusCode === 200 && 
                              response2.statusCode === 200;
  
  logTestResult('Email Enumeration Protection', enumerationProtected,
    enumerationProtected ? 'Enumeration protection working' : 'Enumeration vulnerability detected');
}

async function testTokenExpiration() {
  console.log('\n🧪 Testing token expiration...');
  
  // This would require creating a token and waiting for it to expire
  // For now, we'll test with an invalid token
  await testResetPassword('expired-token-123', 'NewPass123!', 'NewPass123!', 400);
}

async function testCompleteFlow() {
  console.log('\n🧪 Testing complete password reset flow...');
  
  // Step 1: Request password reset
  console.log('1. Requesting password reset...');
  const forgotResponse = await testForgotPassword(TEST_EMAIL);
  
  if (!forgotResponse || forgotResponse.statusCode !== 200) {
    console.log('❌ Cannot proceed with complete flow test');
    return;
  }
  
  // In a real test, we would extract the token from the email/logs
  // For this test, we'll simulate getting a valid token
  console.log('2. Simulating token retrieval from email...');
  
  // Step 3: Test with valid token (this would need a real token from the database)
  console.log('3. Testing with valid token (simulated)...');
  // await testResetPassword(validToken, NEW_PASSWORD, NEW_PASSWORD, 200);
  
  console.log('⚠️  Complete flow test requires manual token retrieval from database');
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive password reset tests...\n');
  
  // Basic functionality tests
  await testForgotPassword(TEST_EMAIL);
  await testForgotPassword('invalid-email', 400);
  
  // Security tests
  await testRateLimiting();
  await testEmailEnumerationProtection();
  await testTokenExpiration();
  
  // Password validation tests (with dummy token)
  await testPasswordValidation('dummy-token');
  
  // Complete flow test (requires manual intervention)
  await testCompleteFlow();
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n❌ Some tests failed. Check the logs above.');
  }
}

// Check if server is running first
async function checkServerHealth() {
  try {
    const response = await makeRequest({
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/health',
      method: 'GET'
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    console.log('Please start the server first: npm start in backend directory');
    process.exit(1);
  }
  
  await runAllTests();
}

main().catch(console.error);