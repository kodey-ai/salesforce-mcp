#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import jsforce from 'jsforce';

export const configSchema = z.object({
  // OAuth 2.0 with Refresh Token (Recommended)
  clientId: z.string().optional().describe('Salesforce OAuth2 Client ID (Connected App Consumer Key)'),
  clientSecret: z.string().optional().describe('Salesforce OAuth2 Client Secret (Connected App Consumer Secret)'),
  refreshToken: z.string().optional().describe('Salesforce OAuth2 Refresh Token'),

  // Username/Password (Alternative)
  username: z.string().optional().describe('Salesforce username'),
  password: z.string().optional().describe('Salesforce password'),
  securityToken: z.string().optional().describe('Salesforce security token (if required)'),

  // Common settings
  accessToken: z.string().optional().describe('Salesforce access token (if already authenticated)'),
  instanceUrl: z.string().optional().describe('Salesforce instance URL (e.g., https://yourinstance.my.salesforce.com)'),
  loginUrl: z.string().default('https://login.salesforce.com').describe('Salesforce login URL (use https://test.salesforce.com for sandboxes)'),
});

export default function createServer({ config }) {
  const server = new McpServer({
    name: 'salesforce-mcp',
    version: '1.0.0',
  });

  // Helper function to authenticate and get connection
  async function getSalesforceConnection() {
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

  server.registerTool(
    'soql_query',
    {
      title: 'Execute SOQL Query',
      description: 'Execute SOQL queries on Salesforce and return results',
      inputSchema: z.object({
        query: z.string().describe('SOQL query to execute (e.g., SELECT Id, Name FROM Account LIMIT 10)'),
      }),
    },
    async ({ query }) => {
      try {
        const conn = await getSalesforceConnection();
        const result = await conn.query(query);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              totalSize: result.totalSize,
              done: result.done,
              records: result.records
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error executing query: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_sobject_describe',
    {
      title: 'Describe Salesforce Object',
      description: 'Get metadata about a Salesforce object (fields, relationships, etc.)',
      inputSchema: z.object({
        objectName: z.string().describe('Salesforce object API name (e.g., Account, Contact, CustomObject__c)'),
      }),
    },
    async ({ objectName }) => {
      try {
        const conn = await getSalesforceConnection();
        const metadata = await conn.sobject(objectName).describe();

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
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error describing object: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'insert_record',
    {
      title: 'Insert Record',
      description: 'Insert a new record into a Salesforce object. Provide the object type and field values as a JSON object.',
      inputSchema: z.object({
        sobjectType: z.string().describe('The Salesforce object API name (e.g., Account, Contact, Opportunity, CustomObject__c)'),
        recordData: z.record(z.any()).describe('JSON object with field API names as keys and values to insert. Required fields must be included (e.g., {"FirstName": "John", "LastName": "Doe", "Email": "john@example.com"})'),
      }),
    },
    async ({ sobjectType, recordData }) => {
      try {
        // Validate inputs
        if (!sobjectType) {
          return {
            content: [{
              type: 'text',
              text: 'Error: sobjectType parameter is required',
            }],
            isError: true,
          };
        }

        if (!recordData || Object.keys(recordData).length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'Error: recordData parameter is required and must contain at least one field',
            }],
            isError: true,
          };
        }

        const conn = await getSalesforceConnection();
        const result = await conn.sobject(sobjectType).create(recordData);

        // Handle JSForce result type - can be single or array
        const singleResult = Array.isArray(result) ? result[0] : result;

        // Check if the result has success property and it's false
        if ('success' in singleResult && singleResult.success === false) {
          const errors = Array.isArray(singleResult.errors)
            ? singleResult.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ')
            : JSON.stringify(singleResult.errors);

          return {
            content: [{
              type: 'text',
              text: `Failed to insert ${sobjectType} record: ${errors}`,
            }],
            isError: true,
          };
        }

        // Check if we have an id (successful insert)
        if (!singleResult.id) {
          return {
            content: [{
              type: 'text',
              text: `Failed to insert ${sobjectType} record: No record ID returned`,
            }],
            isError: true,
          };
        }

        return {
          content: [{
            type: 'text',
            text: `Successfully inserted ${sobjectType} record.\n\nRecord ID: ${singleResult.id}\n\nInserted data:\n${JSON.stringify(recordData, null, 2)}`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error inserting record: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );

  return server;
}