const https = require('https');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxtNAdK6OfAlKk4ATAz7V-OwJIodOBLe3J1GSpryi_tzSwj6L7F9_ybTYTHWMpnxWNQbw/exec';

function makeAPICall(action, data = {}) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            action: action,
            data: data,
            user: {
                employeeId: 'sup-001',
                email: 'yohanes.luhur@example.com',
                name: 'Yohanes Luhur',
                role: 'supervisor'
            }
        });

        const url = new URL(SCRIPT_URL);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    resolve({ success: false, error: 'Invalid JSON response', rawResponse: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(payload);
        req.end();
    });
}

async function testAPI() {
    console.log('Testing KPI Dashboard Backend API...\n');

    // Test 1: Basic connectivity
    console.log('1. Testing basic connectivity...');
    try {
        const result = await makeAPICall('authenticateUser', {
            email: 'yohanes.luhur@example.com',
            name: 'Yohanes Luhur'
        });
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get employees
    console.log('2. Testing getEmployees...');
    try {
        const result = await makeAPICall('getEmployees');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Get tasks by supervisor
    console.log('3. Testing getTasksBySupervisor...');
    try {
        const result = await makeAPICall('getTasksBySupervisor', {
            supervisorId: 'sup-001'
        });
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('Error:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Get KPI metrics
    console.log('4. Testing getKPIMetrics...');
    try {
        const result = await makeAPICall('getKPIMetrics', {
            supervisorId: 'sup-001'
        });
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('Error:', error.message);
    }
}

testAPI();