import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import jsforce from "jsforce";

// Configuration schema for API key and Salesforce connection
export const configSchema = z.object({
  salesforceApiKey: z.string().describe("Salesforce API key (Access Token)"),
  salesforceInstanceUrl: z.string().describe("Salesforce instance URL (e.g., https://yourdomain.my.salesforce.com)"),
  apiVersion: z.string().default("59.0").describe("Salesforce API version"),
});

type Config = z.infer<typeof configSchema>;

export default function createServer({ config }: { config?: Config }) {
  const server = new McpServer({
    name: "Salesforce Operations",
    version: "1.0.0",
    description: "MCP server for Salesforce read and insert operations",
  });

  // Helper function to create Salesforce connection
  function getSalesforceConnection() {
    if (!config?.salesforceApiKey || !config?.salesforceInstanceUrl) {
      throw new Error("Salesforce API key and instance URL are required");
    }

    return new jsforce.Connection({
      instanceUrl: config.salesforceInstanceUrl,
      accessToken: config.salesforceApiKey,
      version: config.apiVersion || "59.0",
    });
  }

  // Tool 1: Read records from Salesforce
  server.registerTool(
    "salesforce_read",
    {
      title: "Read Salesforce Records",
      description: "Query and read records from a Salesforce object",
      inputSchema: {
        type: "object",
        properties: {
          objectName: {
            type: "string",
            description: "Salesforce object name (e.g., Account, Contact, Lead)",
          },
          query: {
            type: "string",
            description: "SOQL query string or simple filter conditions",
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Fields to retrieve (optional, defaults to all accessible fields)",
          },
          limit: {
            type: "number",
            description: "Maximum number of records to return",
            default: 10,
          },
        },
        required: ["objectName"],
      },
    },
    async (args: any) => {
      try {
        const conn = getSalesforceConnection();

        let soqlQuery: string;

        // Build SOQL query
        if (args.query && args.query.toUpperCase().startsWith("SELECT")) {
          // User provided a full SOQL query
          soqlQuery = args.query;
        } else {
          // Build query from parameters
          const fields = args.fields?.join(", ") || "*";
          const whereClause = args.query ? ` WHERE ${args.query}` : "";
          const limitClause = args.limit ? ` LIMIT ${args.limit}` : " LIMIT 10";

          if (fields === "*") {
            // First describe the object to get all fields
            const describe = await conn.sobject(args.objectName).describe();
            const allFields = describe.fields.map((f: any) => f.name).join(", ");
            soqlQuery = `SELECT ${allFields} FROM ${args.objectName}${whereClause}${limitClause}`;
          } else {
            soqlQuery = `SELECT ${fields} FROM ${args.objectName}${whereClause}${limitClause}`;
          }
        }

        // Execute query
        const result = await conn.query(soqlQuery);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                totalRecords: result.totalSize,
                records: result.records,
                query: soqlQuery,
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error.message,
                details: error.errorCode || error.name,
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Tool 2: Insert records into Salesforce
  server.registerTool(
    "salesforce_insert",
    {
      title: "Insert Salesforce Records",
      description: "Insert one or more records into a Salesforce object",
      inputSchema: {
        type: "object",
        properties: {
          objectName: {
            type: "string",
            description: "Salesforce object name (e.g., Account, Contact, Lead)",
          },
          records: {
            type: "array",
            description: "Array of records to insert",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
          allOrNone: {
            type: "boolean",
            description: "If true, all inserts must succeed or all will be rolled back",
            default: false,
          },
        },
        required: ["objectName", "records"],
      },
    },
    async (args: any) => {
      try {
        const conn = getSalesforceConnection();

        // Prepare records for insertion
        const recordsToInsert = Array.isArray(args.records) ? args.records : [args.records];

        // Insert records
        let result;
        if (recordsToInsert.length === 1) {
          // Single record insert
          result = await conn.sobject(args.objectName).create(recordsToInsert[0]);
        } else {
          // Bulk insert
          result = await conn.sobject(args.objectName).create(recordsToInsert, {
            allOrNone: args.allOrNone || false,
          });
        }

        // Format response
        const results = Array.isArray(result) ? result : [result];
        const successful = results.filter((r: any) => r.success);
        const failed = results.filter((r: any) => !r.success);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: failed.length === 0,
                inserted: successful.length,
                failed: failed.length,
                results: results.map((r: any) => ({
                  id: r.id || null,
                  success: r.success,
                  errors: r.errors || [],
                })),
                summary: `Successfully inserted ${successful.length} record(s)${failed.length > 0 ? `, ${failed.length} failed` : ""}`,
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error.message,
                details: error.errorCode || error.name,
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Resource: Salesforce connection info
  server.registerResource(
    "salesforce_info",
    {
      title: "Salesforce Connection Info",
      description: "Get information about the current Salesforce connection",
    },
    async () => {
      try {
        if (!config?.salesforceApiKey || !config?.salesforceInstanceUrl) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  connected: false,
                  message: "No Salesforce connection configured",
                }, null, 2),
              },
            ],
          };
        }

        const conn = getSalesforceConnection();
        const identity = await conn.identity();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                connected: true,
                instanceUrl: config.salesforceInstanceUrl,
                apiVersion: config.apiVersion || "59.0",
                user: {
                  id: identity.user_id,
                  username: identity.username,
                  displayName: identity.display_name,
                  organizationId: identity.organization_id,
                },
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                connected: false,
                error: error.message,
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Prompt: Example queries
  server.registerPrompt(
    "salesforce_examples",
    {
      title: "Salesforce Operation Examples",
      description: "Example queries and inserts for Salesforce",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Here are some example Salesforce operations:

## Reading Records:

1. Read all Accounts:
   - Object: Account
   - Fields: Name, Industry, AnnualRevenue
   - Limit: 5

2. Read Contacts with filter:
   - Object: Contact
   - Query: "Email != null"
   - Fields: FirstName, LastName, Email

3. Custom SOQL query:
   - Query: "SELECT Id, Name FROM Opportunity WHERE StageName = 'Closed Won' LIMIT 10"

## Inserting Records:

1. Insert a new Account:
   - Object: Account
   - Record: { "Name": "Acme Corp", "Industry": "Technology" }

2. Insert multiple Contacts:
   - Object: Contact
   - Records: [
       { "FirstName": "John", "LastName": "Doe", "Email": "john@example.com" },
       { "FirstName": "Jane", "LastName": "Smith", "Email": "jane@example.com" }
     ]`,
          },
        },
      ],
    })
  );

  return server.server;
}