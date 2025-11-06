const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/leaderboard?page=1&limit=5',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Not JSON or parse error:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();