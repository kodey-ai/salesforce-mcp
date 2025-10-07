#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'salesforce-simple',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'soql_query',
    description: 'Execute SOQL queries on Salesforce',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SOQL query to execute',
        },
      },
      required: ['query'],
    },
  }],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'soql_query') {
    const { query } = request.params.arguments;
    const username = process.env.SALESFORCE_USERNAME || 'maya@ecotoreda.com';

    return {
      content: [{
        type: 'text',
        text: `SOQL: ${query}\nOrg: ${username}`,
      }],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Salesforce MCP Server running on stdio');
}

main();