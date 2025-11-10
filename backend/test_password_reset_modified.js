const http = require('http');

const testConfig = {
    host: 'localhost',
    port: 8080,
    testUser: {
        email: 'test@example.com',
        password: 'Test123!'
    }
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsed = responseData ? JSON.parse(responseData) : {};
                    resolve({
                        statusCode: res.statusCode,
                        data: parsed
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => reject(error));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testResetPasswordEndpoint() {
    console.log('🧪 Testing reset-password endpoint directly...');
    
    // Test with invalid token first
    const testData = {
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
    };

    try {
        const response = await makeRequest({
            host: testConfig.host,
            port: testConfig.port,
            path: '/api/auth/reset-password',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, testData);

        console.log(`Reset Password Response: ${response.statusCode}`, response.data);
        
        if (response.statusCode === 404) {
            console.log('❌ Reset password endpoint returns 404 - endpoint not found');
        } else if (response.statusCode === 400) {
            console.log('✅ Reset password endpoint is working (returned 400 for invalid token)');
        } else {
            console.log(`⚠️  Reset password endpoint returned: ${response.statusCode}`);
        }
    } catch (error) {
        console.error('❌ Error testing reset password endpoint:', error.message);
    }
}

async function testForgotPasswordWithBypass() {
    console.log('\n🧪 Testing forgot-password with bypass headers...');
    
    const testData = { email: testConfig.testUser.email };
    
    try {
        const response = await makeRequest({
            host: testConfig.host,
            port: testConfig.port,
            path: '/api/auth/forgot-password',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Bypass': 'test' // Try to bypass rate limiting
            }
        }, testData);

        console.log(`Forgot Password Response: ${response.statusCode}`, response.data);
    } catch (error) {
        console.error('❌ Error testing forgot password:', error.message);
    }
}

async function main() {
    console.log('🚀 Starting modified password reset tests...');
    
    await testResetPasswordEndpoint();
    await testForgotPasswordWithBypass();
    
    console.log('\n📊 Modified tests completed');
}

main().catch(console.error);