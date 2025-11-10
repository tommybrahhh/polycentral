// Test script for password reset endpoint
const http = require('http');

const testData = JSON.stringify({
  email: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/forgot-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const jsonResponse = JSON.parse(data);
      console.log('Parsed Response:', jsonResponse);
    } catch (e) {
      console.log('Response is not valid JSON:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(testData);
req.end();