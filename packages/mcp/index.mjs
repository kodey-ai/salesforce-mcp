#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'salesforce-simple',
  version: '1.0.0',
  capabilities: { tools: {} }
});

// SOQL query tool
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'soql_query',
    description: 'Execute SOQL on Salesforce',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    }
  }]
}));

server.setRequestHandler('tools/call', async (request) => {
  const { query } = request.params.arguments;

  // For now, return a placeholder - you'll configure real auth on Smithery
  return {
    content: [{
      type: 'text',
      text: `SOQL: ${query}\nOrg: ${process.env.SALESFORCE_USERNAME || 'maya@ecotoreda.com'}`
    }]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Salesforce MCP running');