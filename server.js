/**
 * TableMint Production Server Entry Point
 * Required by hosting platforms (Render, Railway, Heroku) when Start Command is 'node server.js'.
 * Automatically sets the working directory to backend and starts the application.
 */
const path = require('path');

const backendDir = path.join(__dirname, 'backend');
try {
  process.chdir(backendDir);
} catch (err) {
  console.warn('[Root Entry] Could not switch working directory to backend:', err.message);
}

// Start backend server
require('./backend/server.js');
