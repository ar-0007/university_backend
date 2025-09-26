const { generateAdminCredentials } = require('./generate-admin-credentials.js');
const getSupabaseClient = require('./src/utils/supabaseClient.js');

/**
 * Inserts admin credentials into the database
 */
async function insertAdminCredentials() {
  try {
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Generate admin credentials
    console.log('Generating admin credentials...');
    const credentials = await generateAdminCredentials();
    
    // Check if admin user already exists
    console.log('Checking if admin user already exists...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', credentials.user.email)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
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
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingUser.user_id)
        .select('user_id, email, first_name, last_name, role, is_active')
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
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: credentials.user.email,
        password_hash: credentials.hashedPassword,
        salt: credentials.salt,
        first_name: credentials.user.firstName,
        last_name: credentials.user.lastName,
        role: credentials.user.role,
        is_active: credentials.user.isActive
      })
      .select('user_id, email, first_name, last_name, role, is_active')
      .single();
      
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
      console.log('Admin credentials insertion completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin credentials insertion failed:', error);
      process.exit(1);
    });
}

module.exports = { insertAdminCredentials };