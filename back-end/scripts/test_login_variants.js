const http = require('http');

async function testLogin(identifier, password) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ username: identifier, password });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/users/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing Owner Login Credentials:\n');

  const testCases = [
    { id: 'owner1', pw: 'owner123' },
    { id: 'Owner1', pw: 'owner123' },
    { id: 'owner1@example.com', pw: 'owner123' },
    { id: 'rajesh_owner', pw: 'owner123' },
    { id: 'rajesh.k@email.com', pw: 'owner123' },
    { id: 'owner2', pw: 'owner123' }
  ];

  for (const tc of testCases) {
    const res = await testLogin(tc.id, tc.pw);
    if (res.status === 201) {
      console.log(`✓ SUCCESS: [${tc.id}] / [${tc.pw}] -> User: ${res.data.name} (Role: ${res.data.role}, ID: ${res.data.id}, Token: ${!!res.data.token})`);
    } else {
      console.log(`✗ FAILED:  [${tc.id}] / [${tc.pw}] -> Status: ${res.status}, Message:`, res.data?.message);
    }
  }
}

run();
