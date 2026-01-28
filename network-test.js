// Simple network connectivity test
async function testNetworkConnectivity() {
  console.log('🌐 Network Connectivity Test\n');
  
  const testUrls = [
    'https://httpbin.org/get',
    'https://jsonplaceholder.typicode.com/posts/1',
    'https://api.github.com',
    'https://www.google.com',
    'https://qwixblmbmupurjjditra.supabase.co'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000 // 10 second timeout
      });
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Success - Status: ${response.status}, Time: ${duration}ms\n`);
    } catch (error) {
      console.log(`❌ Failed - Error: ${error.message}\n`);
    }
  }
  
  // Test DNS resolution
  console.log('🔍 DNS Resolution Test:');
  try {
    const dns = require('dns').promises;
    const result = await dns.lookup('qwixblmbmupurjjditra.supabase.co');
    console.log(`✅ DNS resolved: ${result.address}`);
  } catch (dnsError) {
    console.log(`❌ DNS resolution failed: ${dnsError.message}`);
  }
}

testNetworkConnectivity().catch(console.error);