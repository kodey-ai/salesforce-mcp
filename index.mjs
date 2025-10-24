#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import jsforce from 'jsforce';

// Import Zod for schema definition
import { z } from 'zod';

// Configuration schema for Smithery - using Zod as per documentation
export const configSchema = z.object({
  clientId: z.string().optional().describe('Salesforce OAuth Client ID'),
  clientSecret: z.string().optional().describe('Salesforce OAuth Client Secret'),
  username: z.string().optional().describe('Salesforce username'),
  password: z.string().optional().describe('Salesforce password'),
  securityToken: z.string().optional().describe('Salesforce security token (append to password if needed)'),
  instanceUrl: z.string().optional().describe('Salesforce instance URL (e.g., https://your-instance.salesforce.com)'),
  refreshToken: z.string().optional().describe('OAuth refresh token for persistent authentication'),
  accessToken: z.string().optional().describe('Direct access token if already authenticated'),
  loginUrl: z.string().default('https://login.salesforce.com').optional().describe('Salesforce login URL')
});

// Main server factory function for Smithery - MUST be default export
export default function createServer(options = {}) {
  // Extract config from options (Smithery passes it as { config: {...} })
  const config = options.config || {};

  const server = new McpServer({
    name: 'salesforce-mcp',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Helper function to authenticate and get connection
  async function getSalesforceConnection() {
    // Check if any credentials are provided in config
    const hasCredentials = config.clientId || config.username || config.accessToken;

    if (!hasCredentials) {
      throw new Error('No Salesforce credentials configured. Please provide authentication in configuration.');
    }

    // Option 1: OAuth 2.0 Client Credentials Flow
    if (config.clientId && config.clientSecret && !config.username && !config.refreshToken) {
      const tokenUrl = `${config.instanceUrl || 'https://login.salesforce.com'}/services/oauth2/token`;

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`OAuth Client Credentials failed: ${data.error} - ${data.error_description}`);
      }

      return new jsforce.Connection({
        instanceUrl: data.instance_url,
        accessToken: data.access_token
      });
    }

    // Option 2: OAuth with Refresh Token
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

    // Option 3: OAuth 2.0 Username-Password Flow
    if (config.username && config.password && config.clientId && config.clientSecret) {
      const conn = new jsforce.Connection({
        oauth2: {
          clientId: config.clientId,
          clientSecret: config.clientSecret
        },
        loginUrl: config.loginUrl || 'https://login.salesforce.com'
      });

      const password = config.securityToken
        ? config.password + config.securityToken
        : config.password;

      await conn.login(config.username, password);
      return conn;
    }

    // Option 4: Username/Password Flow (without OAuth)
    if (config.username && config.password) {
      const conn = new jsforce.Connection({
        loginUrl: config.loginUrl || 'https://login.salesforce.com'
      });

      const password = config.securityToken
        ? config.password + config.securityToken
        : config.password;

      await conn.login(config.username, password);
      return conn;
    }

    // Option 5: Access Token (if already authenticated)
    if (config.instanceUrl && config.accessToken) {
      return new jsforce.Connection({
        instanceUrl: config.instanceUrl,
        accessToken: config.accessToken
      });
    }

    throw new Error('Authentication configuration missing. Provide credentials in server configuration.');
  }

  // Register tools/list handler
  server.server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: 'soql_query',
        description: 'Execute SOQL queries on Salesforce and return results',
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
        description: 'Get metadata about a Salesforce object (fields, relationships, etc.)',
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
              description: 'The Salesforce object API name (e.g., Account, Contact, quotation__c)'
            },
            recordData: {
              type: 'object',
              description: 'JSON object with field values',
              additionalProperties: true
            }
          },
          required: ['sobjectType', 'recordData']
        }
      },
      {
        name: 'update_record',
        description: 'Update an existing record in Salesforce',
        inputSchema: {
          type: 'object',
          properties: {
            sobjectType: {
              type: 'string',
              description: 'The Salesforce object API name'
            },
            recordId: {
              type: 'string',
              description: 'The ID of the record to update'
            },
            recordData: {
              type: 'object',
              description: 'JSON object with field values to update',
              additionalProperties: true
            }
          },
          required: ['sobjectType', 'recordId', 'recordData']
        }
      },
      {
        name: 'delete_record',
        description: 'Delete a record from Salesforce',
        inputSchema: {
          type: 'object',
          properties: {
            sobjectType: {
              type: 'string',
              description: 'The Salesforce object API name'
            },
            recordId: {
              type: 'string',
              description: 'The ID of the record to delete'
            }
          },
          required: ['sobjectType', 'recordId']
        }
      }
    ]
  }));

  // Register tools/call handler
  server.server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    try {
      // Only check for connection when actually calling a tool
      let conn;
      try {
        conn = await getSalesforceConnection();
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}\n\nPlease configure Salesforce credentials in your server settings.`
          }],
          isError: true
        };
      }

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
                fields: metadata.fields.map(f => ({
                  name: f.name,
                  label: f.label,
                  type: f.type,
                  length: f.length,
                  required: !f.nillable,
                  updateable: f.updateable
                }))
              }, null, 2)
            }]
          };
        }

        case 'insert_record': {
          const { sobjectType, recordData } = args;

          if (!sobjectType || !recordData) {
            return {
              content: [{
                type: 'text',
                text: 'Error: sobjectType and recordData are required'
              }],
              isError: true
            };
          }

          const result = await conn.sobject(sobjectType).create(recordData);
          const singleResult = Array.isArray(result) ? result[0] : result;

          if ('success' in singleResult && singleResult.success === false) {
            const errors = singleResult.errors
              ? singleResult.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ')
              : 'Unknown error';

            return {
              content: [{
                type: 'text',
                text: `Failed to insert ${sobjectType} record: ${errors}`
              }],
              isError: true
            };
          }

          return {
            content: [{
              type: 'text',
              text: `Successfully inserted ${sobjectType} record.\nRecord ID: ${singleResult.id}\n\nInserted data:\n${JSON.stringify(recordData, null, 2)}`
            }]
          };
        }

        case 'update_record': {
          const { sobjectType, recordId, recordData } = args;

          if (!sobjectType || !recordId || !recordData) {
            return {
              content: [{
                type: 'text',
                text: 'Error: sobjectType, recordId and recordData are required'
              }],
              isError: true
            };
          }

          const result = await conn.sobject(sobjectType).update({
            Id: recordId,
            ...recordData
          });

          const singleResult = Array.isArray(result) ? result[0] : result;

          if ('success' in singleResult && singleResult.success === false) {
            const errors = singleResult.errors
              ? singleResult.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ')
              : 'Unknown error';

            return {
              content: [{
                type: 'text',
                text: `Failed to update ${sobjectType} record: ${errors}`
              }],
              isError: true
            };
          }

          return {
            content: [{
              type: 'text',
              text: `Successfully updated ${sobjectType} record.\nRecord ID: ${recordId}\n\nUpdated fields:\n${JSON.stringify(recordData, null, 2)}`
            }]
          };
        }

        case 'delete_record': {
          const { sobjectType, recordId } = args;

          if (!sobjectType || !recordId) {
            return {
              content: [{
                type: 'text',
                text: 'Error: sobjectType and recordId are required'
              }],
              isError: true
            };
          }

          const result = await conn.sobject(sobjectType).destroy(recordId);
          const singleResult = Array.isArray(result) ? result[0] : result;

          if ('success' in singleResult && singleResult.success === false) {
            const errors = singleResult.errors
              ? singleResult.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ')
              : 'Unknown error';

            return {
              content: [{
                type: 'text',
                text: `Failed to delete ${sobjectType} record: ${errors}`
              }],
              isError: true
            };
          }

          return {
            content: [{
              type: 'text',
              text: `Successfully deleted ${sobjectType} record with ID: ${recordId}`
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

  // IMPORTANT: Return the server.server instance for Smithery
  return server.server;
}

// If running directly (not via Smithery), use stdio transport with env vars
if (import.meta.url === `file://${process.argv[1]}`) {
  // Create config from environment variables for local testing
  const envConfig = {
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    refreshToken: process.env.SALESFORCE_REFRESH_TOKEN,
    username: process.env.SALESFORCE_USERNAME,
    password: process.env.SALESFORCE_PASSWORD,
    securityToken: process.env.SALESFORCE_SECURITY_TOKEN,
    instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
    accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
  };

  // Remove undefined values
  Object.keys(envConfig).forEach(key => envConfig[key] === undefined && delete envConfig[key]);

  const mcpServer = createServer({ config: envConfig });
  const transport = new StdioServerTransport();

  mcpServer.connect(transport).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}