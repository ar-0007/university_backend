const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up HTTPS for development...');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Generate self-signed certificate
try {
  execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${path.join(certsDir, 'key.pem')} -out ${path.join(certsDir, 'cert.pem')} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, { stdio: 'inherit' });
  console.log('✅ HTTPS certificates generated successfully!');
  console.log('📝 Note: You may need to accept the self-signed certificate in your browser.');
} catch (error) {
  console.log('❌ Failed to generate certificates. You may need to install OpenSSL.');
  console.log('💡 Alternative: Use the development server without HTTPS for now.');
} 