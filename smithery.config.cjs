module.exports = {
  esbuild: {
    // Mark dependencies as external (not bundled)
    external: [
      'jsforce',
      'zod',
      '@modelcontextprotocol/sdk',
      '@smithery/sdk'
    ],
    // Use ESM format to support import.meta
    format: 'esm',
    // Set Node.js target version
    target: 'node18'
  }
};