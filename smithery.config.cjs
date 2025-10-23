module.exports = {
  esbuild: {
    // Bundle all dependencies for a self-contained server
    // Use ESM format to support import.meta
    format: 'esm',
    // Set Node.js target version
    target: 'node18',
    // Enable platform for Node.js
    platform: 'node'
  }
};