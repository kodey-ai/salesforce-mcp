#!/usr/bin/env node

/**
 * Test OAuth Connection Script
 * This script verifies your OAuth setup with Salesforce
 */

import { Connection } from '@salesforce/core';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔐 Testing Salesforce OAuth Connection...\n');

async function testOAuthConnection() {
  try {
    let conn;
    let authMethod;

    // Method 1: Check for OAuth tokens file
    const tokensFile = path.join(__dirname, '.oauth-tokens.json');
    const oauthEnvFile = path.join(__dirname, '.env.oauth');

    try {
      const tokens = JSON.parse(await fs.readFile(tokensFile, 'utf8'));
      if (tokens.access_token && tokens.instance_url) {
        console.log('📌 Using OAuth tokens from .oauth-tokens.json');
        authMethod = 'OAuth Tokens File';
        conn = new Connection({
          instanceUrl: tokens.instance_url,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          oauth2: tokens.refresh_token ? {
            clientId: process.env.SALESFORCE_CLIENT_ID,
            clientSecret: process.env.SALESFORCE_CLIENT_SECRET
          } : undefined,
          version: '59.0'
        });
      }
    } catch (fileError) {
      // File doesn't exist, try other methods
    }

    // Method 2: Use environment variables with OAuth
    if (!conn && process.env.SALESFORCE_ACCESS_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
      console.log('📌 Using OAuth tokens from environment variables');
      authMethod = 'Environment Variables (Access Token)';
      conn = new Connection({
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
        accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
        refreshToken: process.env.SALESFORCE_REFRESH_TOKEN,
        oauth2: process.env.SALESFORCE_REFRESH_TOKEN ? {
          clientId: process.env.SALESFORCE_CLIENT_ID,
          clientSecret: process.env.SALESFORCE_CLIENT_SECRET
        } : undefined,
        version: '59.0'
      });
    }

    // Method 3: OAuth2 Password Flow
    if (!conn && process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET) {
      if (process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD) {
        console.log('📌 Using OAuth2 Password Flow');
        console.log(`   Client ID: ${process.env.SALESFORCE_CLIENT_ID.substring(0, 15)}...`);
        authMethod = 'OAuth2 Password Flow';

        const tokenUrl = `${process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'}/services/oauth2/token`;
        const params = new URLSearchParams({
          grant_type: 'password',
          client_id: process.env.SALESFORCE_CLIENT_ID,
          client_secret: process.env.SALESFORCE_CLIENT_SECRET,
          username: process.env.SALESFORCE_USERNAME,
          password: process.env.SALESFORCE_PASSWORD
        });

        console.log('🔐 Requesting OAuth token...');
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        const tokens = await response.json();

        if (tokens.error) {
          throw new Error(`OAuth Error: ${tokens.error} - ${tokens.error_description}`);
        }

        if (tokens.access_token) {
          console.log('✅ OAuth token obtained successfully!');

          // Save tokens for future use
          await fs.writeFile(tokensFile, JSON.stringify(tokens, null, 2));
          console.log(`💾 Tokens saved to ${tokensFile}`);

          conn = new Connection({
            instanceUrl: tokens.instance_url,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            oauth2: {
              clientId: process.env.SALESFORCE_CLIENT_ID,
              clientSecret: process.env.SALESFORCE_CLIENT_SECRET
            },
            version: '59.0'
          });
        }
      }
    }

    if (!conn) {
      console.error('❌ No OAuth configuration found!');
      console.log('\n📋 Setup Instructions:');
      console.log('\n1. First, create a Connected App in Salesforce (see OAUTH_SETUP_GUIDE.md)');
      console.log('\n2. Add these to your .env file:');
      console.log('   SALESFORCE_CLIENT_ID=your_consumer_key');
      console.log('   SALESFORCE_CLIENT_SECRET=your_consumer_secret');
      console.log('   SALESFORCE_USERNAME=your_username');
      console.log('   SALESFORCE_PASSWORD=your_password+security_token');
      console.log('\n3. Run: node oauth-setup.js');
      console.log('   This will help you set up OAuth interactively');
      process.exit(1);
    }

    console.log('\n🔍 Testing Connection...');
    console.log(`   Auth Method: ${authMethod}`);
    console.log(`   Instance URL: ${conn.instanceUrl}`);
    console.log(`   Access Token: ${conn.accessToken?.substring(0, 20)}...`);
    if (conn.refreshToken) {
      console.log(`   Refresh Token: ${conn.refreshToken.substring(0, 20)}...`);
    }

    // Test basic query
    console.log('\n📊 Running Test Queries...');

    // Test 1: Count accounts
    const accountCount = await conn.query('SELECT COUNT() FROM Account');
    console.log(`✅ Accounts: ${accountCount.totalSize} records`);

    // Test 2: Count contacts
    const contactCount = await conn.query('SELECT COUNT() FROM Contact');
    console.log(`✅ Contacts: ${contactCount.totalSize} records`);

    // Test 3: Get org info
    const orgInfo = await conn.query('SELECT Name, OrganizationType, InstanceName FROM Organization');
    if (orgInfo.records.length > 0) {
      const org = orgInfo.records[0];
      console.log(`✅ Organization: ${org.Name} (${org.OrganizationType})`);
      console.log(`   Instance: ${org.InstanceName}`);
    }

    // Test 4: Check API limits
    console.log('\n📈 API Limits:');
    const limits = await conn.limits();
    console.log(`   Daily API Requests: ${limits.DailyApiRequests.Remaining}/${limits.DailyApiRequests.Max}`);
    console.log(`   Daily Bulk API: ${limits.DailyBulkApiRequests.Remaining}/${limits.DailyBulkApiRequests.Max}`);
    console.log(`   Concurrent REST Requests: ${limits.ConcurrentAsyncGetReportInstances.Remaining}/${limits.ConcurrentAsyncGetReportInstances.Max}`);

    // Test refresh token (if available)
    if (conn.refreshToken && conn.oauth2) {
      console.log('\n🔄 Testing Token Refresh...');
      try {
        const refreshUrl = `${conn.instanceUrl}/services/oauth2/token`;
        const refreshParams = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: conn.refreshToken,
          client_id: conn.oauth2.clientId,
          client_secret: conn.oauth2.clientSecret
        });

        const refreshResponse = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: refreshParams
        });

        const newTokens = await refreshResponse.json();
        if (newTokens.access_token) {
          console.log('✅ Token refresh successful!');
          console.log(`   New Access Token: ${newTokens.access_token.substring(0, 20)}...`);
        }
      } catch (refreshError) {
        console.log('⚠️  Token refresh not available or failed');
      }
    }

    console.log('\n🎉 OAuth Connection Test Successful!');
    console.log('\n📝 Configuration Summary:');
    console.log('=' .repeat(50));
    console.log('Authentication Method:', authMethod);
    console.log('Instance URL:', conn.instanceUrl);
    console.log('OAuth Client ID:', process.env.SALESFORCE_CLIENT_ID?.substring(0, 15) + '...');
    console.log('Has Refresh Token:', conn.refreshToken ? 'Yes' : 'No');
    console.log('=' .repeat(50));

    console.log('\n✅ Ready for Deployment!');
    console.log('\n🚀 Next Steps:');
    console.log('1. Deploy to smithery.ai: ./deploy-smithery.sh');
    console.log('2. Configure the same OAuth credentials in smithery.ai dashboard');
    console.log('3. Test the REST API endpoints after deployment');

    // Save successful configuration
    const configFile = path.join(__dirname, '.oauth-config.json');
    await fs.writeFile(configFile, JSON.stringify({
      authMethod: authMethod,
      instanceUrl: conn.instanceUrl,
      hasRefreshToken: !!conn.refreshToken,
      clientId: process.env.SALESFORCE_CLIENT_ID,
      testPassed: true,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log(`\n💾 Configuration validated and saved to ${configFile}`);

  } catch (error) {
    console.error('\n❌ OAuth Connection Test Failed!');
    console.error('Error:', error.message);

    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Invalid Grant Error - Common Causes:');
      console.log('1. Incorrect Client ID or Client Secret');
      console.log('2. Connected App not yet activated (wait 2-10 minutes after creation)');
      console.log('3. Incorrect username or password');
      console.log('4. Missing security token');
      console.log('5. IP not whitelisted in Salesforce');
      console.log('6. Using wrong login URL (production vs sandbox)');
    } else if (error.message.includes('invalid_client')) {
      console.log('\n💡 Invalid Client Error:');
      console.log('1. Check your Consumer Key (Client ID) is correct');
      console.log('2. Ensure Connected App is enabled');
      console.log('3. Verify you\'re using the right Salesforce instance');
    } else if (error.message.includes('expired')) {
      console.log('\n💡 Token Expired:');
      console.log('Run: node oauth-setup.js');
      console.log('To get a new access token');
    }

    console.log('\n📚 Resources:');
    console.log('- OAuth Setup Guide: OAUTH_SETUP_GUIDE.md');
    console.log('- Interactive Setup: node oauth-setup.js');
    console.log('- Quick Start: QUICK_START.md');

    process.exit(1);
  }
}

// Run the test
testOAuthConnection().catch(console.error);