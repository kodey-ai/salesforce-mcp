#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export const configSchema = z.object({
  salesforceUsername: z.string().optional().describe('Salesforce username'),
});

export default function createServer({ config }) {
  const server = new McpServer({
    name: 'salesforce-simple',
    version: '1.0.0',
  });

  server.registerTool(
    'soql_query',
    {
      title: 'SOQL Query',
      description: 'Execute SOQL queries on Salesforce',
      inputSchema: {
        query: z.string().describe('SOQL query to execute'),
      },
    },
    async ({ query }) => {
      const username = config?.salesforceUsername || process.env.SALESFORCE_USERNAME || 'maya@ecotoreda.com';

      return {
        content: [{
          type: 'text',
          text: `SOQL: ${query}\nOrg: ${username}`,
        }],
      };
    }
  );

  return server.server;
}