#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import jsforce from 'jsforce';
import dotenv from 'dotenv';

dotenv.config();

// Create Salesforce connection
let sfConnection = null;

async function connectToSalesforce() {
  try {
    const conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
      version: '59.0'
    });

    if (process.env.SALESFORCE_ACCESS_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
      // Use existing token
      conn.accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
      conn.instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
    } else if (process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD) {
      // Login with credentials
      await conn.login(
        process.env.SALESFORCE_USERNAME,
        process.env.SALESFORCE_PASSWORD
      );
    }

    sfConnection = conn;
    console.error('Connected to Salesforce:', conn.instanceUrl);
    return conn;
  } catch (error) {
    console.error('Salesforce connection error:', error.message);
    return null;
  }
}

// Initialize server
const server = new Server(
  {
    name: 'salesforce-mcp-minimal',
    version: '1.0.0',
    capabilities: {
      tools: {}
    }
  }
);

// Define tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'soql_query',
      description: 'Execute a SOQL query on Salesforce',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SOQL query to execute (e.g., SELECT Id, Name FROM Account LIMIT 10)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'get_sobjects',
      description: 'List available Salesforce objects',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  // Ensure connection
  if (!sfConnection) {
    await connectToSalesforce();
  }

  if (!sfConnection) {
    return {
      content: [{
        type: 'text',
        text: 'Failed to connect to Salesforce. Please check your credentials.'
      }]
    };
  }

  try {
    switch (name) {
      case 'soql_query':
        const result = await sfConnection.query(args.query);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              totalSize: result.totalSize,
              done: result.done,
              records: result.records
            }, null, 2)
          }]
        };

      case 'get_sobjects':
        const sobjects = await sfConnection.describeGlobal();
        const objectNames = sobjects.sobjects.map(obj => obj.name).slice(0, 50);
        return {
          content: [{
            type: 'text',
            text: `Available Salesforce Objects (first 50):\n${objectNames.join('\n')}`
          }]
        };

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`
          }]
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    };
  }
});

// Start server
async function main() {
  await connectToSalesforce();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Salesforce MCP Server running');
}

main().catch(console.error);