require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}\n`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Missing required Supabase environment variables');
    return;
  }
  
  try {
    // Test with service role key (admin access)
    console.log('🔧 Testing with Service Role Key...');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test 1: Basic connection test
    console.log('Test 1: Basic connection test...');
    const { data: healthCheck, error: healthError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (healthError) {
      console.log('❌ Basic connection failed:', healthError.message);
    } else {
      console.log('✅ Basic connection successful');
    }
    
    // Test 2: Check if users table exists
    console.log('\nTest 2: Checking users table...');
    const { data: usersTable, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      if (usersError.code === 'PGRST116') {
        console.log('⚠️  Users table does not exist yet');
        console.log('💡 You may need to run your database migrations first');
      } else {
        console.log('❌ Users table check failed:', usersError.message);
      }
    } else {
      console.log('✅ Users table exists and accessible');
      console.log(`📊 Sample data count: ${usersTable ? usersTable.length : 0} records`);
    }
    
    // Test 3: Test with anon key (public access)
    if (process.env.SUPABASE_ANON_KEY) {
      console.log('\nTest 3: Testing with Anonymous Key...');
      const supabaseAnon = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      
      const { data: anonTest, error: anonError } = await supabaseAnon.auth.getSession();
      
      if (anonError) {
        console.log('❌ Anonymous key test failed:', anonError.message);
      } else {
        console.log('✅ Anonymous key working');
      }
    }
    
    // Test 4: Check database schema
    console.log('\nTest 4: Checking database schema...');
    const { data: tables, error: schemaError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (schemaError) {
      console.log('❌ Schema check failed:', schemaError.message);
    } else {
      console.log('✅ Database schema accessible');
      console.log('📋 Available tables:', tables.map(t => t.table_name).join(', '));
    }
    
    console.log('\n🎉 Supabase connection test completed!');
    
  } catch (error) {
    console.error('💥 Unexpected error during connection test:', error.message);
    
    if (error.message.includes('fetch failed')) {
      console.log('\n🔧 Troubleshooting suggestions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the SUPABASE_URL is correct');
      console.log('3. Ensure Supabase project is active and not paused');
      console.log('4. Check if your firewall is blocking the connection');
    }
  }
}

// Run the test
testSupabaseConnection().catch(console.error);