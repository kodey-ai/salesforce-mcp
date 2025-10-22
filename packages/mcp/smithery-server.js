#!/usr/bin/env node

/**
 * Smithery-compatible MCP Server entry point for Salesforce
 * This directly starts the MCP server without the CLI framework
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SfMcpServer } from './lib/sf-mcp-server.js';
import { registerToolsets } from './lib/utils/registry-utils.js';
import { Services } from './lib/services.js';
import Cache from './lib/utils/cache.js';

async function startServer() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let orgs = ['DEFAULT_TARGET_ORG'];
  let toolsets = ['core', 'dx'];

  // Parse --orgs parameter
  const orgsIndex = args.indexOf('--orgs');
  if (orgsIndex !== -1 && args[orgsIndex + 1]) {
    orgs = args[orgsIndex + 1].split(',');
  }

  // Parse --toolsets parameter
  const toolsetsIndex = args.indexOf('--toolsets');
  if (toolsetsIndex !== -1 && args[toolsetsIndex + 1]) {
    toolsets = args[toolsetsIndex + 1].split(',');
  }

  try {
    // Initialize cache
    const cache = new Cache();

    // Initialize services
    const services = new Services();

    // Create the MCP server
    const server = new SfMcpServer(
      'Salesforce MCP Server',
      '0.21.2',
      services
    );

    // Register the toolsets
    const registeredTools = await registerToolsets({
      orgs,
      toolsets: toolsets,
      server,
      services,
      cache
    });

    console.error(`Starting Salesforce MCP server with ${registeredTools.length} tools`);
    console.error(`Orgs: ${orgs.join(', ')}`);
    console.error(`Toolsets: ${toolsets.join(', ')}`);

    // Create and connect the transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Handle shutdown
    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});