#!/usr/bin/env node

/**
 * Test Salesforce Connection Script
 * This script helps you verify your Salesforce credentials before deploying to smithery.ai
 */

import { Connection } from '@salesforce/core';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Testing Salesforce Connection...\n');

async function testConnection() {
  try {
    // Check which authentication method is configured
    if (!process.env.SALESFORCE_USERNAME && !process.env.SALESFORCE_ACCESS_TOKEN) {
      console.error('❌ No Salesforce credentials found!');
      console.log('\nPlease set up your credentials:');
      console.log('1. Copy .env.example to .env');
      console.log('2. Fill in your Salesforce credentials');
      console.log('3. Run this script again\n');

      console.log('Example for username/password auth:');
      console.log('SALESFORCE_USERNAME=your-email@example.com');
      console.log('SALESFORCE_PASSWORD=yourpassword+securitytoken');
      console.log('SALESFORCE_LOGIN_URL=https://login.salesforce.com\n');

      process.exit(1);
    }

    let conn;

    // Method 1: Access Token Authentication
    if (process.env.SALESFORCE_ACCESS_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
      console.log('📌 Using Access Token authentication...');
      conn = new Connection({
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
        accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
        version: process.env.SALESFORCE_API_VERSION || '59.0'
      });
    }
    // Method 2: Username/Password Authentication
    else if (process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD) {
      console.log('📌 Using Username/Password authentication...');
      console.log(`   Username: ${process.env.SALESFORCE_USERNAME}`);
      console.log(`   Login URL: ${process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'}`);

      conn = new Connection({
        loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
        version: process.env.SALESFORCE_API_VERSION || '59.0'
      });

      // Add OAuth2 if client credentials are provided
      if (process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET) {
        console.log('   Using Connected App credentials');
        conn.oauth2 = {
          clientId: process.env.SALESFORCE_CLIENT_ID,
          clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
          redirectUri: 'http://localhost:3000/oauth/callback'
        };
      }

      console.log('\n🔐 Attempting to login...');
      await conn.login(
        process.env.SALESFORCE_USERNAME,
        process.env.SALESFORCE_PASSWORD
      );
    }

    console.log('✅ Successfully connected to Salesforce!\n');
    console.log('📊 Connection Details:');
    console.log(`   Instance URL: ${conn.instanceUrl}`);
    console.log(`   Organization ID: ${conn.userInfo?.organizationId || 'N/A'}`);
    console.log(`   User ID: ${conn.userInfo?.id || 'N/A'}`);
    console.log(`   Access Token: ${conn.accessToken?.substring(0, 20)}...`);

    // Test with a simple SOQL query
    console.log('\n🔍 Testing SOQL Query...');
    const result = await conn.query('SELECT COUNT() FROM Account');
    console.log(`✅ Query successful! Found ${result.totalSize} accounts\n`);

    // Test API limits
    const limits = await conn.limits();
    console.log('📈 API Limits:');
    console.log(`   Daily API Requests: ${limits.DailyApiRequests.Remaining}/${limits.DailyApiRequests.Max}`);
    console.log(`   Daily Bulk API Requests: ${limits.DailyBulkApiRequests.Remaining}/${limits.DailyBulkApiRequests.Max}`);

    console.log('\n🎉 Connection test successful! Your credentials are working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('1. Run: ./deploy-smithery.sh');
    console.log('2. Use these same credentials when prompted');
    console.log('3. After deployment, configure the same environment variables in smithery.ai\n');

    // Save connection info for deployment script
    const configPath = path.join(__dirname, '.salesforce-config.json');
    await fs.writeFile(configPath, JSON.stringify({
      instanceUrl: conn.instanceUrl,
      username: process.env.SALESFORCE_USERNAME,
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
      apiVersion: process.env.SALESFORCE_API_VERSION || '59.0',
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`💾 Configuration saved to ${configPath}`);

  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);

    if (error.message.includes('INVALID_LOGIN')) {
      console.log('\n💡 Common causes:');
      console.log('1. Incorrect username or password');
      console.log('2. Missing security token (append it to your password)');
      console.log('3. IP not whitelisted in Salesforce');
      console.log('4. Using wrong login URL (production vs sandbox)');
      console.log('\nTo get your security token:');
      console.log('1. Log into Salesforce');
      console.log('2. Go to Settings → My Personal Information → Reset My Security Token');
      console.log('3. Check your email for the new token');
      console.log('4. Append it to your password in the .env file');
    } else if (error.message.includes('UNABLE_TO_LOCK_ROW')) {
      console.log('\n💡 The org is busy. Please try again in a few moments.');
    } else if (error.message.includes('REQUEST_LIMIT_EXCEEDED')) {
      console.log('\n💡 API limit exceeded. Please try again later or use a different org.');
    }

    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);