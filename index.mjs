#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import jsforce from 'jsforce';

export const configSchema = z.object({
  username: z.string().describe('Salesforce username'),
  password: z.string().describe('Salesforce password'),
  securityToken: z.string().optional().describe('Salesforce security token (if required)'),
  loginUrl: z.string().default('https://login.salesforce.com').describe('Salesforce login URL'),
});

export default function createServer({ config }) {
  const server = new McpServer({
    name: 'salesforce-mcp',
    version: '1.0.0',
  });

  // Helper function to authenticate and get connection
  async function getSalesforceConnection() {
    const conn = new jsforce.Connection({
      loginUrl: config.loginUrl || 'https://login.salesforce.com'
    });

    const password = config.securityToken
      ? config.password + config.securityToken
      : config.password;

    await conn.login(config.username, password);
    return conn;
  }

  server.registerTool(
    'soql_query',
    {
      title: 'Execute SOQL Query',
      description: 'Execute SOQL queries on Salesforce and return results',
      inputSchema: {
        query: z.string().describe('SOQL query to execute (e.g., SELECT Id, Name FROM Account LIMIT 10)'),
      },
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
      inputSchema: {
        objectName: z.string().describe('Salesforce object API name (e.g., Account, Contact, CustomObject__c)'),
      },
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

  return server.server;
}