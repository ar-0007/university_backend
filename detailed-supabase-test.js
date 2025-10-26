require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function detailedSupabaseTest() {
  console.log('🔍 Detailed Supabase Diagnostic Test\n');
  
  // Display current environment values (masked for security)
  console.log('📋 Current Configuration:');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'Not set'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...' : 'Not set'}\n`);
  
  try {
    // Test 1: Validate URL format
    console.log('Test 1: URL Format Validation...');
    const url = new URL(process.env.SUPABASE_URL);
    console.log(`✅ URL is valid: ${url.hostname}`);
    
    // Test 2: Test basic HTTP connectivity
    console.log('\nTest 2: Basic HTTP Connectivity...');
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        }
      });
      console.log(`✅ HTTP connectivity successful (Status: ${response.status})`);
    } catch (httpError) {
      console.log(`❌ HTTP connectivity failed: ${httpError.message}`);
      return;
    }
    
    // Test 3: Test with different client configurations
    console.log('\nTest 3: Client Configuration Tests...');
    
    // Test with anon key
    const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    console.log('Testing anon client...');
    
    try {
      const { data: anonData, error: anonError } = await anonClient.auth.getSession();
      if (anonError) {
        console.log(`⚠️  Anon client error: ${anonError.message}`);
      } else {
        console.log('✅ Anon client working');
      }
    } catch (e) {
      console.log(`❌ Anon client exception: ${e.message}`);
    }
    
    // Test with service role key
    console.log('\nTesting service role client...');
    const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    try {
      // Try a simple RPC call first
      const { data: rpcData, error: rpcError } = await serviceClient.rpc('version');
      if (rpcError) {
        console.log(`Service role RPC error: ${rpcError.message}`);
      } else {
        console.log('✅ Service role RPC working');
      }
    } catch (e) {
      console.log(`❌ Service role RPC exception: ${e.message}`);
    }
    
    // Test 4: Try different endpoints
    console.log('\nTest 4: Testing Different Endpoints...');
    
    const endpoints = [
      '/rest/v1/',
      '/auth/v1/settings',
      '/rest/v1/rpc/version'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${process.env.SUPABASE_URL}${endpoint}`, {
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ ${endpoint}: Status ${response.status}`);
      } catch (e) {
        console.log(`❌ ${endpoint}: ${e.message}`);
      }
    }
    
    // Test 5: Check if it's a CORS or network policy issue
    console.log('\nTest 5: Network Policy Check...');
    try {
      const testUrl = 'https://httpbin.org/get';
      const testResponse = await fetch(testUrl);
      console.log(`✅ External HTTP requests work (Status: ${testResponse.status})`);
    } catch (e) {
      console.log(`❌ External HTTP requests blocked: ${e.message}`);
      console.log('💡 This suggests a network/firewall issue');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.log('\n🔧 Possible Issues:');
    console.log('1. Network connectivity problems');
    console.log('2. Firewall blocking Supabase domains');
    console.log('3. Invalid or expired service role key');
    console.log('4. Supabase project is paused or deleted');
  }
}

detailedSupabaseTest().catch(console.error);