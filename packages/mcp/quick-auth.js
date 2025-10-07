#!/usr/bin/env node

// Quick authentication without Connected App
import { Connection } from '@salesforce/core';

async function quickAuth() {
  try {
    console.log('🚀 Quick Authentication...\n');

    // Direct connection with session ID from Workbench
    const conn = new Connection({
      instanceUrl: 'https://zot.my.salesforce.com',
      version: '59.0'
    });

    // Try basic auth (might work with MFA disabled temporarily)
    await conn.login('maya@ecotoreda.com', 'Ec0T0red@');

    console.log('✅ Connected!');
    console.log('Instance:', conn.instanceUrl);
    console.log('Access Token:', conn.accessToken?.substring(0, 30) + '...');

    // Save token
    const fs = require('fs').promises;
    await fs.writeFile('.quick-token.json', JSON.stringify({
      accessToken: conn.accessToken,
      instanceUrl: conn.instanceUrl
    }));

    console.log('\n✅ Token saved! Ready to deploy.');

  } catch(e) {
    console.log('Direct login failed. Use Workbench method below.');
  }
}

quickAuth();