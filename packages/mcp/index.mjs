#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import jsforce from 'jsforce';

const server = new Server({
  name: 'salesforce-simple',
  version: '1.0.0',
  capabilities: { tools: {} }
});

// Create Salesforce connection
async function getConnection() {
  const conn = new jsforce.Connection({
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
  });

  await conn.login(
    process.env.SALESFORCE_USERNAME,
    process.env.SALESFORCE_PASSWORD
  );

  return conn;
}

// List all available tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'soql_query',
      description: 'Execute SOQL queries on Salesforce and return results',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SOQL query to execute (e.g., SELECT Id, Name FROM Account)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'insert_record',
      description: 'Insert a new record into a Salesforce object',
      inputSchema: {
        type: 'object',
        properties: {
          sobjectType: {
            type: 'string',
            description: 'The Salesforce object API name (e.g., Account, Contact, Opportunity)'
          },
          recordData: {
            type: 'object',
            description: 'JSON object with field names and values (e.g., {"Name": "Acme Corp", "Industry": "Technology"})'
          }
        },
        required: ['sobjectType', 'recordData']
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const conn = await getConnection();

    if (name === 'soql_query') {
      const { query } = args;
      const result = await conn.query(query);

      return {
        content: [{
          type: 'text',
          text: `SOQL query results:\n\n${JSON.stringify(result, null, 2)}`
        }]
      };
    }

    if (name === 'insert_record') {
      const { sobjectType, recordData } = args;

      // Validate inputs
      if (!sobjectType) {
        return {
          content: [{
            type: 'text',
            text: 'Error: sobjectType parameter is required'
          }],
          isError: true
        };
      }

      if (!recordData || Object.keys(recordData).length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Error: recordData parameter is required and must contain at least one field'
          }],
          isError: true
        };
      }

      // Insert the record
      const result = await conn.sobject(sobjectType).create(recordData);

      // Handle result (can be single or array)
      const singleResult = Array.isArray(result) ? result[0] : result;

      if ('success' in singleResult && singleResult.success === false) {
        const errors = Array.isArray(singleResult.errors)
          ? singleResult.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ')
          : JSON.stringify(singleResult.errors);

        return {
          content: [{
            type: 'text',
            text: `Failed to insert ${sobjectType} record: ${errors}`
          }],
          isError: true
        };
      }

      if (!singleResult.id) {
        return {
          content: [{
            type: 'text',
            text: `Failed to insert ${sobjectType} record: No record ID returned`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully inserted ${sobjectType} record.\n\nRecord ID: ${singleResult.id}\n\nInserted data:\n${JSON.stringify(recordData, null, 2)}`
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Unknown tool: ${name}`
      }],
      isError: true
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Salesforce MCP running');