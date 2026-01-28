const https = require('https');
const fs = require('fs');
const path = require('path');

// Self-signed certificate for development
const options = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

module.exports = options; 