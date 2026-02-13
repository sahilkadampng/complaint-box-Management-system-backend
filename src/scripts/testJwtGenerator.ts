/**
 * Simple script to test the JWT Secret Generator endpoint
 * 
 * Usage:
 *   npm run dev (in another terminal)
 *   tsx src/scripts/testJwtGenerator.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface JwtSecretResponse {
    secret: string;
    length: number;
    message: string;
    usage: string;
}

interface ErrorResponse {
    error: string;
}

interface PasswordHashResponse {
    hash: string;
    message: string;
}

async function testJwtGenerator() {
    console.log('🧪 Testing JWT Secret Generator...\n');

    try {
        // Test 1: Generate secret with default length
        console.log('📝 Test 1: Generate JWT secret with default length (64 bytes)');
        const response1 = await fetch(`${API_URL}/api/utils/generate-jwt-secret`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response1.ok) {
            throw new Error(`HTTP error! status: ${response1.status}`);
        }

        const result1 = await response1.json() as JwtSecretResponse;
        console.log('✅ Success!');
        console.log(`   Secret length: ${result1.length} characters`);
        console.log(`   Secret (first 50 chars): ${result1.secret.substring(0, 50)}...`);
        console.log(`   Usage: ${result1.usage.substring(0, 70)}...\n`);

        // Test 2: Generate secret with custom length
        console.log('📝 Test 2: Generate JWT secret with custom length (32 bytes)');
        const response2 = await fetch(`${API_URL}/api/utils/generate-jwt-secret`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ length: 32 }),
        });

        if (!response2.ok) {
            throw new Error(`HTTP error! status: ${response2.status}`);
        }

        const result2 = await response2.json() as JwtSecretResponse;
        console.log('✅ Success!');
        console.log(`   Secret length: ${result2.length} characters`);
        console.log(`   Secret: ${result2.secret}`);
        console.log(`   Usage: ${result2.usage}\n`);

        // Test 3: Test invalid length (should fail)
        console.log('📝 Test 3: Test with invalid length (10 bytes - below minimum)');
        const response3 = await fetch(`${API_URL}/api/utils/generate-jwt-secret`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ length: 10 }),
        });

        if (response3.status === 400) {
            const result3 = await response3.json() as ErrorResponse;
            console.log('✅ Correctly rejected invalid length');
            console.log(`   Error message: ${result3.error}\n`);
        } else {
            console.log('❌ Should have rejected invalid length\n');
        }

        // Test password hashing
        console.log('📝 Test 4: Hash a password');
        const response4 = await fetch(`${API_URL}/api/utils/hash-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: 'testPassword123' }),
        });

        if (!response4.ok) {
            throw new Error(`HTTP error! status: ${response4.status}`);
        }

        const result4 = await response4.json() as PasswordHashResponse;
        console.log('✅ Success!');
        console.log(`   Hash (first 50 chars): ${result4.hash.substring(0, 50)}...`);
        console.log(`   Message: ${result4.message}\n`);

        console.log('🎉 All tests completed successfully!');
        
    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch(`${API_URL}/api/health`);
        if (!response.ok) {
            throw new Error('Server not responding correctly');
        }
        return true;
    } catch (error) {
        console.error('❌ Server is not running or not accessible at', API_URL);
        console.error('   Please start the server with: npm run dev');
        process.exit(1);
    }
}

// Main execution
(async () => {
    console.log('🔍 Checking if server is running...\n');
    await checkServer();
    console.log('✅ Server is running!\n');
    await testJwtGenerator();
})();
