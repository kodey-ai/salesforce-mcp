#!/usr/bin/env node

/**
 * Minimal Smithery-compatible MCP Server for Salesforce
 * This server provides essential Salesforce operations through MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import jsforce from 'jsforce';

// Create server
const server = new Server({
  name: 'salesforce-mcp',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
});

// Salesforce connection management
let sfConnection = null;

async function getConnection() {
  if (sfConnection) return sfConnection;

  try {
    const conn = new jsforce.Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
      version: '59.0'
    });

    // Try OAuth first
    if (process.env.SALESFORCE_CLIENT_ID &&
        process.env.SALESFORCE_CLIENT_SECRET &&
        process.env.SALESFORCE_REFRESH_TOKEN) {
      await conn.oauth2.refreshToken(process.env.SALESFORCE_REFRESH_TOKEN);
    }
    // Try access token
    else if (process.env.SALESFORCE_ACCESS_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
      conn.accessToken = process.env.SALESFORCE_ACCESS_TOKEN;
      conn.instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
    }
    // Try username/password
    else if (process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD) {
      const password = process.env.SALESFORCE_SECURITY_TOKEN
        ? process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
        : process.env.SALESFORCE_PASSWORD;
      await conn.login(process.env.SALESFORCE_USERNAME, password);
    } else {
      throw new Error('No valid Salesforce authentication credentials provided');
    }

    sfConnection = conn;
    console.error(`Connected to Salesforce: ${conn.instanceUrl}`);
    return conn;
  } catch (error) {
    console.error('Salesforce connection error:', error.message);
    throw error;
  }
}

// Register tools
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
        properties: {
          customOnly: {
            type: 'boolean',
            description: 'If true, only return custom objects'
          }
        }
      }
    },
    {
      name: 'describe_sobject',
      description: 'Get detailed information about a Salesforce object',
      inputSchema: {
        type: 'object',
        properties: {
          objectName: {
            type: 'string',
            description: 'Name of the Salesforce object (e.g., Account, Contact)'
          }
        },
        required: ['objectName']
      }
    },
    {
      name: 'insert_record',
      description: 'Insert a new record into a Salesforce object',
      inputSchema: {
        type: 'object',
        properties: {
          objectName: {
            type: 'string',
            description: 'Name of the Salesforce object'
          },
          record: {
            type: 'object',
            description: 'Record data to insert'
          }
        },
        required: ['objectName', 'record']
      }
    },
    {
      name: 'update_record',
      description: 'Update an existing Salesforce record',
      inputSchema: {
        type: 'object',
        properties: {
          objectName: {
            type: 'string',
            description: 'Name of the Salesforce object'
          },
          recordId: {
            type: 'string',
            description: 'ID of the record to update'
          },
          fields: {
            type: 'object',
            description: 'Fields to update'
          }
        },
        required: ['objectName', 'recordId', 'fields']
      }
    },
    {
      name: 'delete_record',
      description: 'Delete a Salesforce record',
      inputSchema: {
        type: 'object',
        properties: {
          objectName: {
            type: 'string',
            description: 'Name of the Salesforce object'
          },
          recordId: {
            type: 'string',
            description: 'ID of the record to delete'
          }
        },
        required: ['objectName', 'recordId']
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const conn = await getConnection();

    switch (name) {
      case 'soql_query': {
        const result = await conn.query(args.query);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              totalSize: result.totalSize,
              records: result.records
            }, null, 2)
          }]
        };
      }

      case 'get_sobjects': {
        const sobjects = await conn.describeGlobal();
        let objects = sobjects.sobjects;

        if (args.customOnly) {
          objects = objects.filter(obj => obj.custom);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: objects.length,
              objects: objects.map(obj => ({
                name: obj.name,
                label: obj.label,
                custom: obj.custom,
                queryable: obj.queryable,
                createable: obj.createable
              }))
            }, null, 2)
          }]
        };
      }

      case 'describe_sobject': {
        const metadata = await conn.sobject(args.objectName).describe();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              name: metadata.name,
              label: metadata.label,
              custom: metadata.custom,
              fields: metadata.fields.map(field => ({
                name: field.name,
                type: field.type,
                label: field.label,
                required: !field.nillable && !field.defaultedOnCreate
              }))
            }, null, 2)
          }]
        };
      }

      case 'insert_record': {
        const result = await conn.sobject(args.objectName).create(args.record);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              id: result.id,
              errors: result.errors || []
            }, null, 2)
          }]
        };
      }

      case 'update_record': {
        const result = await conn.sobject(args.objectName).update({
          Id: args.recordId,
          ...args.fields
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              id: result.id,
              errors: result.errors || []
            }, null, 2)
          }]
        };
      }

      case 'delete_record': {
        const result = await conn.sobject(args.objectName).destroy(args.recordId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              id: result.id,
              errors: result.errors || []
            }, null, 2)
          }]
        };
      }

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
        text: JSON.stringify({
          success: false,
          error: error.message,
          errorCode: error.errorCode
        }, null, 2)
      }]
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Salesforce MCP Server running');
}

main().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});