/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';
import { McpTool, McpToolConfig, ReleaseState, Services, Toolset } from '@salesforce/mcp-provider-api';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { textResponse } from '../shared/utils.js';
import { directoryParam, usernameOrAliasParam } from '../shared/params.js';

/*
 * Insert Record into Salesforce org
 *
 * Insert a record into a Salesforce org using the REST API.
 *
 * Parameters:
 * - sobjectType: The Salesforce object type (e.g., Account, Contact, CustomObject__c)
 * - recordData: JSON object containing the field values for the record
 * - usernameOrAlias: username or alias for the Salesforce org to insert the record into
 *
 * Returns:
 * - textResponse: Created record ID and success status
 */

export const insertRecordParamsSchema = z.object({
  sobjectType: z.string().describe('The Salesforce object API name (e.g., Account, Contact, Opportunity, CustomObject__c). Standard objects use singular form. Custom objects end with __c.'),
  recordData: z.record(z.any()).describe('JSON object with field API names as keys and values to insert. Required fields must be included (e.g., LastName for Contact, Name for Account). Example: {"FirstName": "John", "LastName": "Doe", "Email": "john@example.com"}'),
  usernameOrAlias: usernameOrAliasParam,
  directory: directoryParam,
});

type InputArgs = z.infer<typeof insertRecordParamsSchema>;
type InputArgsShape = typeof insertRecordParamsSchema.shape;
type OutputArgsShape = z.ZodRawShape;

export class InsertRecordMcpTool extends McpTool<InputArgsShape, OutputArgsShape> {
  public constructor(private readonly services: Services) {
    super();
  }

  public getReleaseState(): ReleaseState {
    return ReleaseState.GA;
  }

  public getToolsets(): Toolset[] {
    return [Toolset.DATA];
  }

  public getName(): string {
    return 'insert_record';
  }

  public getConfig(): McpToolConfig<InputArgsShape, OutputArgsShape> {
    return {
      title: 'Insert Record',
      description: 'Insert a new record into a Salesforce org. Provide the object type (e.g., Account, Contact, CustomObject__c) and field values as a JSON object. Returns the created record ID on success. Use this for creating single records; for required fields validation errors, check the Salesforce object schema first.',
      inputSchema: insertRecordParamsSchema.shape,
      outputSchema: undefined,
      annotations: {
        openWorldHint: false,
        readOnlyHint: false,
      },
    };
  }

  public async exec(input: InputArgs): Promise<CallToolResult> {
    try {
      if (!input.usernameOrAlias) {
        return textResponse(
          'The usernameOrAlias parameter is required. If the user did not specify one, use the #get_username tool',
          true,
        );
      }

      if (!input.sobjectType) {
        return textResponse(
          'The sobjectType parameter is required (e.g., Account, Contact, CustomObject__c)',
          true,
        );
      }

      if (!input.recordData || Object.keys(input.recordData).length === 0) {
        return textResponse(
          'The recordData parameter is required and must contain at least one field-value pair',
          true,
        );
      }

      process.chdir(input.directory);
      const connection = await this.services.getOrgService().getConnection(input.usernameOrAlias);

      // Use the JSForce sobject API to create the record
      const result = await connection.sobject(input.sobjectType).create(input.recordData);

      // Handle JSForce result type - can be single or array
      const singleResult = Array.isArray(result) ? result[0] : result;

      // Check if the result has success property and it's false
      if ('success' in singleResult && singleResult.success === false) {
        const errors = Array.isArray(singleResult.errors)
          ? singleResult.errors.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join(', ')
          : JSON.stringify(singleResult.errors);
        return textResponse(
          `Failed to insert ${input.sobjectType} record: ${errors}`,
          true,
        );
      }

      // Check if we have an id (successful insert)
      if (!singleResult.id) {
        return textResponse(
          `Failed to insert ${input.sobjectType} record: No record ID returned`,
          true,
        );
      }

      return textResponse(
        `Successfully inserted ${input.sobjectType} record.\n\nRecord ID: ${singleResult.id}\n\nInserted data:\n${JSON.stringify(input.recordData, null, 2)}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return textResponse(
        `Failed to insert record: ${errorMessage}`,
        true,
      );
    }
  }
}
