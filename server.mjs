#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import jsforce from 'jsforce';

// Create server instance
const server = new Server({
  name: 'salesforce-mcp',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

// Helper function to get Salesforce connection
async function getSalesforceConnection() {
  const config = {
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    refreshToken: process.env.SALESFORCE_REFRESH_TOKEN,
    username: process.env.SALESFORCE_USERNAME,
    password: process.env.SALESFORCE_PASSWORD,
    securityToken: process.env.SALESFORCE_SECURITY_TOKEN,
    instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
    accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
  };

  // OAuth with Refresh Token
  if (config.refreshToken && config.clientId && config.clientSecret) {
    const conn = new jsforce.Connection({
      oauth2: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: 'http://localhost:3000/oauth/callback'
      },
      instanceUrl: config.instanceUrl,
      refreshToken: config.refreshToken
    });
    return conn;
  }

  // Username/Password with OAuth
  if (config.username && config.password && config.clientId && config.clientSecret) {
    const conn = new jsforce.Connection({
      oauth2: {
        clientId: config.clientId,
        clientSecret: config.clientSecret
      },
      loginUrl: config.loginUrl
    });

    const password = config.securityToken
      ? config.password + config.securityToken
      : config.password;

    await conn.login(config.username, password);
    return conn;
  }

  // Username/Password without OAuth
  if (config.username && config.password) {
    const conn = new jsforce.Connection({
      loginUrl: config.loginUrl
    });

    const password = config.securityToken
      ? config.password + config.securityToken
      : config.password;

    await conn.login(config.username, password);
    return conn;
  }

  // Access Token
  if (config.instanceUrl && config.accessToken) {
    return new jsforce.Connection({
      instanceUrl: config.instanceUrl,
      accessToken: config.accessToken
    });
  }

  throw new Error('No valid Salesforce authentication configuration found');
}

// Tool: SOQL Query
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'soql_query',
      description: 'Execute SOQL queries on Salesforce',
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
      name: 'get_sobject_describe',
      description: 'Get metadata about a Salesforce object',
      inputSchema: {
        type: 'object',
        properties: {
          objectName: {
            type: 'string',
            description: 'Salesforce object API name (e.g., Account, Contact, CustomObject__c)'
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
          sobjectType: {
            type: 'string',
            description: 'The Salesforce object API name'
          },
          recordData: {
            type: 'object',
            description: 'JSON object with field values',
            additionalProperties: true
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
    const conn = await getSalesforceConnection();

    switch (name) {
      case 'soql_query': {
        const result = await conn.query(args.query);
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
      }

      case 'get_sobject_describe': {
        const metadata = await conn.sobject(args.objectName).describe();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              name: metadata.name,
              label: metadata.label,
              fields: metadata.fields.map(field => ({
                name: field.name,
                type: field.type,
                label: field.label,
                required: !field.nillable && !field.defaultedOnCreate,
                updateable: field.updateable,
                createable: field.createable
              }))
            }, null, 2)
          }]
        };
      }

      case 'insert_record': {
        if (!args.sobjectType || !args.recordData) {
          return {
            content: [{
              type: 'text',
              text: 'Error: sobjectType and recordData are required'
            }],
            isError: true
          };
        }

        const result = await conn.sobject(args.sobjectType).create(args.recordData);
        const singleResult = Array.isArray(result) ? result[0] : result;

        if ('success' in singleResult && singleResult.success === false) {
          const errors = singleResult.errors
            ? singleResult.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ')
            : 'Unknown error';

          return {
            content: [{
              type: 'text',
              text: `Failed to insert ${args.sobjectType} record: ${errors}`
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text',
            text: `Successfully inserted ${args.sobjectType} record.\nRecord ID: ${singleResult.id}\n\nInserted data:\n${JSON.stringify(args.recordData, null, 2)}`
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown tool: ${name}`
          }],
          isError: true
        };
    }
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