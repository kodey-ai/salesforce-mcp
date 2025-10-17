#!/usr/bin/env node

// Simple Salesforce MCP Server
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
  name: 'salesforce-simple',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// Add SOQL tool
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'execute_soql',
    description: 'Execute SOQL query on Salesforce',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SOQL query to execute' }
      },
      required: ['query']
    }
  }]
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'execute_soql') {
    const { query } = request.params.arguments;

    // For now, return mock data
    return {
      content: [{
        type: 'text',
        text: `Query: ${query}\nResults: Connected to ${process.env.SALESFORCE_USERNAME || 'zot.my.salesforce.com'}`
      }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Salesforce MCP Server running');
}

main().catch(console.error);