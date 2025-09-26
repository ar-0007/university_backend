// src/utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// Ensure environment variables are loaded
require('dotenv').config();

let supabaseClientInstance = null;

/**
 * Initializes and returns a singleton Supabase client instance.
 * The Supabase JS client handles connection pooling and retries internally.
 * Using a singleton ensures that only one client instance is created and reused.
 * @returns {import('@supabase/supabase-js').SupabaseClient} The Supabase client instance.
 */
function getSupabaseClient() {
  if (!supabaseClientInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
      // It's critical to have these. You might want to throw an error or exit.
      throw new Error('Supabase credentials are not set.');
    }

    supabaseClientInstance = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        // Optional: Configure global fetch options, headers, etc.
        // For example, to ensure keep-alive for connections
        global: {
          fetch: (...args) => fetch(...args), // Use default fetch
          headers: { 'x-my-custom-header': 'my-app-name' },
        },
        // Optional: Configure auth options
        auth: {
          persistSession: false, // Server-side, we usually don't need to persist sessions in browser storage
          autoRefreshToken: false, // Handled by JWT logic
        }
      }
    );
    console.log('Supabase client initialized.');
  }
  return supabaseClientInstance;
}

// At the end of supabaseClient.js
module.exports = getSupabaseClient;
module.exports.supabase = getSupabaseClient(); // Export initialized instance
module.exports.getSupabaseClient = getSupabaseClient; // Export function
