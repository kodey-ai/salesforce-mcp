#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStatelessServer } from '@smithery/sdk/server/stateless.js';
import jsforce from 'jsforce';

function createServer({ config = {} } = {}) {
  const server = new Server({
    name: 'salesforce-mcp',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {}
    }
  });

  // Validate config early
  const hasCredentials = config.clientId || config.username || config.accessToken;
  if (!hasCredentials) {
    console.error('❌ No Salesforce credentials configured. Please provide authentication via config.');
    console.error('Expected: clientId/clientSecret, username/password, or accessToken/instanceUrl');
  }

  // Helper function to authenticate and get connection
  async function getSalesforceConnection() {
    // Check if any credentials are provided
    if (!hasCredentials) {
      throw new Error('No Salesforce credentials configured. Please provide authentication via environment variables or config.');
    }

    // Option 1: OAuth 2.0 Client Credentials Flow (Recommended - no username/password needed)
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

      // Connection will auto-refresh when needed
      return conn;
    }

    // Option 3: OAuth 2.0 Username-Password Flow (with Consumer Key/Secret)
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

    throw new Error('Authentication configuration missing. Provide either: (clientId + clientSecret) for Client Credentials Flow, (refreshToken + clientId + clientSecret), (username + password + clientId + clientSecret), or (username + password)');
  }

  // Register tools/list handler
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
      }
    ]
  }));

  // Register tools/call handler
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

  return server;
}

// Create config from environment variables
const envConfig = {
  // OAuth settings
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  refreshToken: process.env.SALESFORCE_REFRESH_TOKEN,

  // Username/Password
  username: process.env.SALESFORCE_USERNAME,
  password: process.env.SALESFORCE_PASSWORD,
  securityToken: process.env.SALESFORCE_SECURITY_TOKEN,

  // Instance settings
  instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
  accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
  loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
};

// Remove undefined values
Object.keys(envConfig).forEach(key => envConfig[key] === undefined && delete envConfig[key]);

// Create factory function for Smithery - IMPORTANT: Must return the server, not just the function
function createMcpServer({ config = {} } = {}) {
  // Merge the provided config with env config
  const mergedConfig = { ...envConfig, ...config };
  return createServer({ config: mergedConfig });
}

// For Smithery HTTP hosting
if (process.env.PORT) {
  // HTTP mode for Smithery deployment
  const port = process.env.PORT || 8081;  // Smithery uses port 8081

  // Create Express app manually for proper CORS configuration
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  const app = express();

  // Configure CORS for all origins as required by Smithery
  app.use(cors({
    origin: '*',  // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: '*',
    exposedHeaders: ['mcp-session-id', 'mcp-protocol-version'],
    maxAge: 86400
  }));

  // Use the smithery SDK's createStatelessServer with the configured app
  const statelessServer = createStatelessServer(createMcpServer, {
    app: app,
    logLevel: 'info'
  });

  // The statelessServer.app is the configured Express app
  statelessServer.app.listen(port, () => {
    console.log(`Salesforce MCP Server running on port ${port} (Smithery HTTP mode)`);
    console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
  });
} else {
  // Stdio mode for local development
  const server = createServer({ config: envConfig });
  const transport = new StdioServerTransport();

  server.connect(transport).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export for module usage
export default createMcpServer;