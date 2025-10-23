module.exports = {
  // Entry point for your MCP server
  entry: './index.mjs',

  // Transport type - stdio for command-line usage
  transport: 'stdio',

  // Build configuration
  build: {
    // Use ESM format to support import.meta
    format: 'esm',

    // External modules that shouldn't be bundled
    external: [
      'jsforce',
      'zod'
    ]
  }
};