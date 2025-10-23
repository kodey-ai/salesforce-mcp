module.exports = {
  esbuild: {
    // Mark dependencies as external (not bundled)
    // Note: @smithery/sdk and @modelcontextprotocol/sdk should be bundled
    external: [
      'jsforce',
      'zod'
    ],
    // Use ESM format to support import.meta
    format: 'esm',
    // Set Node.js target version
    target: 'node18',
    // Enable platform for Node.js
    platform: 'node'
  }
};