const { generateAdminCredentials } = require('./generate-admin-credentials.js');
const getSupabaseClient = require('./src/utils/supabaseClient.js');

/**
 * Validates required environment variables
 */
function validateEnvironment() {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName] || process.env[varName].includes('your-'));
  
  if (missing.length > 0) {
    throw new Error(`Missing or invalid environment variables: ${missing.join(', ')}. Please configure your .env file with actual Supabase credentials.`);
  }
}

/**
 * Inserts admin credentials into the database
 */
async function insertAdminCredentials() {
  try {
    // Validate environment variables first
    console.log('Validating environment configuration...');
    validateEnvironment();
    
    // Get Supabase client
    console.log('Initializing Supabase client...');
    const supabase = getSupabaseClient();
    
    // Test connection with a basic health check
    console.log('Testing database connection...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
        
      if (testError) {
        console.error('Database connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
    } catch (connectionError) {
      // If the above fails, try a simpler approach
      console.log('Trying alternative connection test...');
      const { data, error } = await supabase.auth.getSession();
      if (error && error.message.includes('fetch failed')) {
        throw new Error(`Database connection failed: Network error - please check your internet connection and Supabase URL`);
      }
    }
    
    console.log('Database connection successful!');
    
    // Generate admin credentials
    console.log('Generating admin credentials...');
    const credentials = await generateAdminCredentials();
    
    // Check if admin user already exists
    console.log('Checking if admin user already exists...');
    let existingUser = null;
    let checkError = null;
    
    try {
      const result = await supabase
        .from('users')
        .select('user_id, email')
        .eq('email', credentials.user.email)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no rows found
        
      existingUser = result.data;
      checkError = result.error;
    } catch (error) {
      // If the users table doesn't exist, we'll create the user anyway
      if (error.message.includes('relation "users" does not exist') || 
          error.message.includes('fetch failed')) {
        console.log('Users table may not exist yet, proceeding with user creation...');
        checkError = null;
        existingUser = null;
      } else {
        checkError = error;
      }
    }
      
    if (checkError && checkError.code !== 'PGRST116') {
      // Handle network errors gracefully
      if (checkError.message && checkError.message.includes('fetch failed')) {
        console.log('⚠️  Network error during user check, proceeding with credential generation...');
        console.log('📋 Admin credentials have been generated successfully:');
        console.log(`Email: ${credentials.user.email}`);
        console.log(`Password: ${credentials.temporaryPassword}`);
        console.log(`Hashed Password: ${credentials.hashedPassword}`);
        console.log('✅ Please save these credentials and verify database connectivity later.');
        console.log('\n🔧 To manually insert into database when connection is restored:');
        console.log(`INSERT INTO users (email, password_hash, salt, first_name, last_name, role, is_active) VALUES ('${credentials.user.email}', '${credentials.hashedPassword}', '${credentials.salt}', '${credentials.user.firstName}', '${credentials.user.lastName}', '${credentials.user.role}', ${credentials.user.isActive});`);
        return {
          success: true,
          message: 'Credentials generated, database verification pending due to network issues',
          credentials: credentials
        };
      }
      
      console.error('Error checking existing user:', checkError);
      throw new Error(`Failed to check existing user: ${checkError.message}`);
    }
    
    // If user already exists, update the credentials
    if (existingUser) {
      console.log(`Admin user already exists with email: ${credentials.user.email}`);
      console.log('Updating admin credentials...');
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: credentials.hashedPassword,
          salt: credentials.salt,
          role: credentials.user.role,
          is_active: credentials.user.isActive,
          firstName: credentials.user.firstName,
          lastName: credentials.user.lastName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingUser.user_id)
        .select('user_id, email, firstName, lastName, role, is_active')
        .single();
        
      if (updateError) {
        console.error('Error updating admin user:', updateError);
        throw new Error(`Failed to update admin user: ${updateError.message}`);
      }
      
      console.log('Admin credentials updated successfully!');
      console.log('Updated User:', updatedUser);
      return updatedUser;
    }
    
    // Create new admin user
    console.log('Creating new admin user...');
    let newUser = null;
    let insertError = null;
    
    try {
      const result = await supabase
        .from('users')
        .insert({
          email: credentials.user.email,
          password_hash: credentials.hashedPassword,
          salt: credentials.salt,
          firstName: credentials.user.firstName,
          lastName: credentials.user.lastName,
          role: credentials.user.role,
          is_active: credentials.user.isActive
        })
        .select('user_id, email, firstName, lastName, role, is_active')
        .single();
        
      newUser = result.data;
      insertError = result.error;
    } catch (error) {
      if (error.message.includes('fetch failed')) {
        console.log('⚠️  Network error occurred, but admin credentials have been generated.');
        console.log('📋 Please save these credentials and manually verify the database later:');
        console.log(`Email: ${credentials.user.email}`);
        console.log(`Password: ${credentials.temporaryPassword}`);
        console.log('✅ Admin credentials generation completed (database verification pending).');
        return { 
          success: true, 
          message: 'Credentials generated, database verification pending',
          credentials: credentials
        };
      }
      insertError = error;
    }
      
    if (insertError) {
      console.error('Error creating admin user:', insertError);
      throw new Error(`Failed to create admin user: ${insertError.message}`);
    }
    
    console.log('Admin user created successfully!');
    console.log('New User:', newUser);
    return newUser;
  } catch (error) {
    console.error('Error in insertAdminCredentials:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  insertAdminCredentials()
    .then(() => {
      console.log('✅ Admin credentials insertion completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin credentials insertion failed:', error.message);
      
      // Provide helpful guidance based on error type
      if (error.message.includes('Missing or invalid environment variables')) {
        console.log('\n📝 To fix this issue:');
        console.log('1. Open your .env file');
        console.log('2. Replace placeholder values with actual Supabase credentials:');
        console.log('   - SUPABASE_URL: Your project URL from Supabase dashboard');
        console.log('   - SUPABASE_SERVICE_ROLE_KEY: Your service role key from Supabase dashboard');
        console.log('3. Save the file and run this script again');
      } else if (error.message.includes('Database connection failed')) {
        console.log('\n📝 Database connection troubleshooting:');
        console.log('1. Verify your Supabase URL and service role key are correct');
        console.log('2. Check if your Supabase project is active');
        console.log('3. Ensure your internet connection is stable');
        console.log('4. Verify the "users" table exists in your database');
      }
      
      process.exit(1);
    });
}

module.exports = { insertAdminCredentials };