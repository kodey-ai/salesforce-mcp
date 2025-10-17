#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import jsforce from 'jsforce';

export const configSchema = z.object({
  username: z.string().describe('Salesforce username'),
  password: z.string().describe('Salesforce password with security token appended'),
  loginUrl: z.string().default('https://login.salesforce.com').describe('Salesforce login URL (use https://test.salesforce.com for sandboxes)'),
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

    await conn.login(config.username, config.password);
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

  server.registerTool(
    'insert_record',
    {
      title: 'Insert Record',
      description: 'Insert a new record into a Salesforce object. Provide the object type and field values as a JSON object.',
      inputSchema: {
        sobjectType: z.string().describe('The Salesforce object API name (e.g., Account, Contact, Opportunity, CustomObject__c)'),
        recordData: z.record(z.any()).describe('JSON object with field API names as keys and values to insert. Required fields must be included (e.g., {"FirstName": "John", "LastName": "Doe", "Email": "john@example.com"})'),
      },
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