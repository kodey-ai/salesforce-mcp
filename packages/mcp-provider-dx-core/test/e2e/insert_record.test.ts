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

import path from 'node:path';
import { expect, assert } from 'chai';
import { McpTestClient, DxMcpTransport } from '@salesforce/mcp-test-client';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { z } from 'zod';
import { ensureString } from '@salesforce/ts-types';
import { insertRecordParamsSchema } from '../../src/tools/insert_record.js';

describe('insert_record', () => {
  const client = new McpTestClient();

  let testSession: TestSession;
  let orgUsername: string;

  const insertRecordSchema = {
    name: z.literal('insert_record'),
    params: insertRecordParamsSchema,
  };

  before(async () => {
    try {
      testSession = await TestSession.create({
        project: { gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc' },
        scratchOrgs: [{ setDefault: true, config: path.join('config', 'project-scratch-def.json') }],
        devhubAuthStrategy: 'AUTO',
      });

      execCmd('project deploy start', {
        cli: 'sf',
        ensureExitCode: 0,
      });

      testSession.orgs.get('')?.orgId;
      orgUsername = [...testSession.orgs.keys()][0];

      const transport = DxMcpTransport({
        orgUsername: ensureString(orgUsername),
      });

      await client.connect(transport);
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  after(async () => {
    await testSession.clean();

    if (client.connected) {
      await client.disconnect();
    }
  });

  it('should insert a custom object record', async () => {
    const result = await client.callTool(insertRecordSchema, {
      name: 'insert_record',
      params: {
        sobjectType: 'Broker__c',
        recordData: {
          Name: 'Test Broker',
          Email__c: 'test.broker@example.com',
          Phone__c: '555-0123',
        },
        usernameOrAlias: orgUsername,
        directory: testSession.project.dir,
      },
    });

    expect(result.isError).to.equal(false);
    expect(result.content.length).to.equal(1);
    if (result.content[0].type !== 'text') assert.fail();

    const responseText = result.content[0].text;
    expect(responseText).to.contain('Successfully inserted Broker__c record');
    expect(responseText).to.contain('Record ID:');
    expect(responseText).to.match(/Record ID: [a-zA-Z0-9]{18}/);
    expect(responseText).to.contain('Test Broker');
    expect(responseText).to.contain('test.broker@example.com');
  });

  it('should insert a standard object record', async () => {
    const result = await client.callTool(insertRecordSchema, {
      name: 'insert_record',
      params: {
        sobjectType: 'Account',
        recordData: {
          Name: 'Test Account',
          Industry: 'Technology',
          Phone: '555-0456',
        },
        usernameOrAlias: orgUsername,
        directory: testSession.project.dir,
      },
    });

    expect(result.isError).to.equal(false);
    expect(result.content.length).to.equal(1);
    if (result.content[0].type !== 'text') assert.fail();

    const responseText = result.content[0].text;
    expect(responseText).to.contain('Successfully inserted Account record');
    expect(responseText).to.contain('Record ID:');
    expect(responseText).to.match(/Record ID: [a-zA-Z0-9]{18}/);
    expect(responseText).to.contain('Test Account');
  });

  it('should handle missing required fields', async () => {
    const result = await client.callTool(insertRecordSchema, {
      name: 'insert_record',
      params: {
        sobjectType: 'Contact',
        recordData: {
          // Missing required LastName field
          FirstName: 'Test',
        },
        usernameOrAlias: orgUsername,
        directory: testSession.project.dir,
      },
    });

    expect(result.isError).to.be.true;
    expect(result.content.length).to.equal(1);
    expect(result.content[0].type).to.equal('text');

    const responseText = result.content[0].text;
    expect(responseText).to.contain('Failed to insert Contact record');
  });

  it('should handle invalid sobject type', async () => {
    const result = await client.callTool(insertRecordSchema, {
      name: 'insert_record',
      params: {
        sobjectType: 'NonExistentObject__c',
        recordData: {
          Name: 'Test',
        },
        usernameOrAlias: orgUsername,
        directory: testSession.project.dir,
      },
    });

    expect(result.isError).to.be.true;
    expect(result.content.length).to.equal(1);
    expect(result.content[0].type).to.equal('text');

    const responseText = result.content[0].text;
    expect(responseText).to.contain('Failed to insert');
  });

  it('should handle missing usernameOrAlias parameter', async () => {
    const result = await client.callTool(insertRecordSchema, {
      name: 'insert_record',
      params: {
        sobjectType: 'Account',
        recordData: { Name: 'Test' },
        usernameOrAlias: '', // Empty username
        directory: testSession.project.dir,
      },
    });

    expect(result.isError).to.be.true;
    expect(result.content.length).to.equal(1);
    expect(result.content[0].type).to.equal('text');

    const responseText = result.content[0].text;
    expect(responseText).to.equal(
      'The usernameOrAlias parameter is required. If the user did not specify one, use the #get_username tool',
    );
  });

  it('should handle empty recordData', async () => {
    const result = await client.callTool(insertRecordSchema, {
      name: 'insert_record',
      params: {
        sobjectType: 'Account',
        recordData: {},
        usernameOrAlias: orgUsername,
        directory: testSession.project.dir,
      },
    });

    expect(result.isError).to.be.true;
    expect(result.content.length).to.equal(1);
    expect(result.content[0].type).to.equal('text');

    const responseText = result.content[0].text;
    expect(responseText).to.equal(
      'The recordData parameter is required and must contain at least one field-value pair',
    );
  });
});
