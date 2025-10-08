#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

const server = new Server({
  name: 'salesforce-simple',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
  const app = express();
  const port = process.env.PORT || 3000;

  app.get('/sse', async (req, res) => {
    const transport = new SSEServerTransport('/message', res);
    await server.connect(transport);
  });

  app.post('/message', async (req, res) => {
    // Message handling is done by the SSE transport
  });

  app.listen(port, () => {
    console.error(`Salesforce MCP Server running on port ${port}`);
  });
}

main();