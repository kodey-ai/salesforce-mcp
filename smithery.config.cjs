module.exports = {
  name: '@salesforce/mcp',
  description: 'MCP Server for interacting with Salesforce instances',
  version: '0.21.2',
  author: 'Salesforce',
  license: 'Apache-2.0',
  repository: 'https://github.com/salesforcecli/mcp',

  // Entry point for your MCP server
  entry: './index.mjs',

  // Transport type - stdio for command-line usage
  transport: 'stdio',

  // Build configuration
  build: {
    // Output directory for built files
    outDir: '.smithery',

    // Use ESM format to support import.meta
    format: 'esm',

    // External modules that shouldn't be bundled
    external: [
      '@salesforce/core',
      '@salesforce/apex-node',
      '@salesforce/source-deploy-retrieve'
    ]
  },

  // Default arguments for the server
  defaultArgs: ['--orgs', 'DEFAULT_TARGET_ORG', '--toolsets', 'core,dx'],

  // Environment variables
  env: {
    NODE_ENV: 'production'
  }
};