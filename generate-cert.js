const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('Generating self-signed certificates for development...');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Generate private key
const privateKey = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create certificate
const cert = crypto.createCertificate();
cert.setPublicKey(privateKey.publicKey);
cert.sign(privateKey.privateKey, 'sha256');

// Write files
fs.writeFileSync(path.join(certsDir, 'key.pem'), privateKey.privateKey);
fs.writeFileSync(path.join(certsDir, 'cert.pem'), cert.export({ type: 'spki', format: 'pem' }));

console.log('✅ Certificates generated successfully!');
console.log('📝 Note: You may need to accept the self-signed certificate in your browser.');
console.log('🔗 Access your app at: https://localhost:3000'); 