const http = require('http');

function testLeaderboardNewFormat() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/leaderboard?page=1&limit=5',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    console.log('✅ New response format test:');
                    console.log('Status Code:', res.statusCode);
                    
                    // Verify the response structure
                    const hasUsers = Array.isArray(parsedData.users);
                    const hasTotal = typeof parsedData.total === 'number';
                    const hasPage = typeof parsedData.page === 'number';
                    const hasLimit = typeof parsedData.limit === 'number';
                    const hasPages = typeof parsedData.pages === 'number';
                    
                    console.log('Has users array:', hasUsers);
                    console.log('Has total count:', hasTotal);
                    console.log('Has page number:', hasPage);
                    console.log('Has limit:', hasLimit);
                    console.log('Has pages count:', hasPages);
                    
                    if (hasUsers && hasTotal && hasPage && hasLimit && hasPages) {
                        console.log('✅ All required fields present');
                        console.log('Total users:', parsedData.total);
                        console.log('Current page:', parsedData.page);
                        console.log('Page limit:', parsedData.limit);
                        console.log('Total pages:', parsedData.pages);
                        console.log('Users returned:', parsedData.users.length);
                        console.log('Sample user:', parsedData.users[0]);
                    } else {
                        console.log('❌ Missing required fields');
                        console.log('Response:', parsedData);
                    }
                    
                    resolve(parsedData);
                } catch (parseError) {
                    console.error('❌ Error parsing JSON:', parseError);
                    console.log('Raw response:', data);
                    reject(parseError);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error);
            reject(error);
        });

        req.end();
    });
}

// Wait a moment for server to restart, then test
setTimeout(() => {
    testLeaderboardNewFormat()
        .then(() => console.log('\n✅ New format test completed successfully!'))
        .catch(err => console.error('❌ Test failed:', err));
}, 2000);