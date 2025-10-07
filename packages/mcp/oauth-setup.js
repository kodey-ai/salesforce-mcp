#!/usr/bin/env node

/**
 * OAuth Setup Helper for Salesforce MCP Server
 * This script helps you set up OAuth2 authentication with Salesforce
 */

import express from 'express';
import { Connection } from '@salesforce/core';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 3000;

// Store OAuth state
let oauthState = {
  state: crypto.randomBytes(16).toString('hex'),
  tokens: null,
  error: null
};

console.log('🔐 Salesforce OAuth2 Setup Helper\n');

// Check for required environment variables
if (!process.env.SALESFORCE_CLIENT_ID || !process.env.SALESFORCE_CLIENT_SECRET) {
  console.error('❌ Missing OAuth credentials in .env file!');
  console.log('\nPlease add these to your .env file:');
  console.log('SALESFORCE_CLIENT_ID=your_consumer_key');
  console.log('SALESFORCE_CLIENT_SECRET=your_consumer_secret');
  console.log('\nGet these from your Salesforce Connected App');
  process.exit(1);
}

// Configure OAuth2 settings
const oauth2Config = {
  clientId: process.env.SALESFORCE_CLIENT_ID,
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  redirectUri: `http://localhost:${PORT}/oauth/callback`,
  loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
};

// Home page with OAuth options
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Salesforce OAuth Setup</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #0070d2; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #0070d2;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 10px 5px;
        }
        .button:hover { background: #005fb2; }
        .success { color: green; padding: 15px; background: #e7f5e7; border-radius: 4px; }
        .error { color: red; padding: 15px; background: #fde7e7; border-radius: 4px; }
        .code { background: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>🔐 Salesforce OAuth2 Setup</h1>

      <div class="section">
        <h2>Choose Authentication Method:</h2>

        <h3>1. Authorization Code Flow (Recommended)</h3>
        <p>This will open Salesforce login in your browser.</p>
        <a href="/auth/start" class="button">Start OAuth Flow</a>

        <h3>2. Username/Password Flow</h3>
        <p>Quick setup using your credentials from .env file.</p>
        <a href="/auth/password" class="button">Use Password Flow</a>

        <h3>3. Manual Token Entry</h3>
        <p>If you already have an access token.</p>
        <a href="/auth/manual" class="button">Enter Token Manually</a>
      </div>

      <div class="section">
        <h2>Connected App Settings:</h2>
        <div class="code">
          Client ID: ${oauth2Config.clientId}<br>
          Login URL: ${oauth2Config.loginUrl}<br>
          Redirect URI: ${oauth2Config.redirectUri}
        </div>
        <p><small>Make sure this redirect URI is added to your Connected App!</small></p>
      </div>
    </body>
    </html>
  `);
});

// Start OAuth2 Authorization Code Flow
app.get('/auth/start', (req, res) => {
  const authUrl = `${oauth2Config.loginUrl}/services/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${oauth2Config.clientId}&` +
    `redirect_uri=${encodeURIComponent(oauth2Config.redirectUri)}&` +
    `state=${oauthState.state}&` +
    `scope=${encodeURIComponent('api refresh_token offline_access')}`;

  console.log('🌐 Opening Salesforce login in browser...');
  res.redirect(authUrl);
});

// OAuth callback handler
app.get('/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    oauthState.error = error_description || error;
    res.send(`
      <html><body>
        <h1>❌ OAuth Error</h1>
        <p style="color: red;">${error_description || error}</p>
        <a href="/">Try Again</a>
      </body></html>
    `);
    return;
  }

  if (state !== oauthState.state) {
    res.send(`
      <html><body>
        <h1>❌ Security Error</h1>
        <p style="color: red;">Invalid state parameter. Possible CSRF attack.</p>
        <a href="/">Try Again</a>
      </body></html>
    `);
    return;
  }

  try {
    // Exchange code for tokens
    const tokenUrl = `${oauth2Config.loginUrl}/services/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: oauth2Config.clientId,
      client_secret: oauth2Config.clientSecret,
      redirect_uri: oauth2Config.redirectUri
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const tokens = await response.json();

    if (tokens.access_token) {
      oauthState.tokens = tokens;
      await saveTokens(tokens);
      res.send(getSuccessPage(tokens));
    } else {
      throw new Error(tokens.error_description || 'Failed to get access token');
    }
  } catch (error) {
    console.error('❌ Token exchange failed:', error);
    res.send(`
      <html><body>
        <h1>❌ Token Exchange Failed</h1>
        <p style="color: red;">${error.message}</p>
        <a href="/">Try Again</a>
      </body></html>
    `);
  }
});

// Password flow authentication
app.get('/auth/password', async (req, res) => {
  if (!process.env.SALESFORCE_USERNAME || !process.env.SALESFORCE_PASSWORD) {
    res.send(`
      <html><body>
        <h1>❌ Missing Credentials</h1>
        <p>Please add SALESFORCE_USERNAME and SALESFORCE_PASSWORD to your .env file</p>
        <a href="/">Back</a>
      </body></html>
    `);
    return;
  }

  try {
    const tokenUrl = `${oauth2Config.loginUrl}/services/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: oauth2Config.clientId,
      client_secret: oauth2Config.clientSecret,
      username: process.env.SALESFORCE_USERNAME,
      password: process.env.SALESFORCE_PASSWORD
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const tokens = await response.json();

    if (tokens.access_token) {
      await saveTokens(tokens);
      res.send(getSuccessPage(tokens));
    } else {
      throw new Error(tokens.error_description || 'Authentication failed');
    }
  } catch (error) {
    res.send(`
      <html><body>
        <h1>❌ Authentication Failed</h1>
        <p style="color: red;">${error.message}</p>
        <p>Common issues:</p>
        <ul>
          <li>Missing security token (append to password)</li>
          <li>IP not whitelisted</li>
          <li>Wrong login URL (production vs sandbox)</li>
        </ul>
        <a href="/">Try Again</a>
      </body></html>
    `);
  }
});

// Manual token entry page
app.get('/auth/manual', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Manual Token Entry</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        input, textarea { width: 100%; padding: 8px; margin: 5px 0; }
        button { background: #0070d2; color: white; padding: 10px 20px; border: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>Manual Token Entry</h1>
      <form action="/auth/save-manual" method="get">
        <label>Access Token:</label>
        <textarea name="access_token" rows="4" required></textarea>

        <label>Instance URL:</label>
        <input type="url" name="instance_url" placeholder="https://yourorg.my.salesforce.com" required>

        <label>Refresh Token (optional):</label>
        <input type="text" name="refresh_token">

        <br><br>
        <button type="submit">Save Tokens</button>
      </form>
    </body>
    </html>
  `);
});

// Save manually entered tokens
app.get('/auth/save-manual', async (req, res) => {
  const tokens = {
    access_token: req.query.access_token,
    instance_url: req.query.instance_url,
    refresh_token: req.query.refresh_token || null,
    token_type: 'Bearer',
    issued_at: Date.now().toString()
  };

  await saveTokens(tokens);
  res.send(getSuccessPage(tokens));
});

// Generate success page HTML
function getSuccessPage(tokens) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Setup Complete</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { background: #e7f5e7; padding: 20px; border-radius: 4px; }
        .code { background: #f4f4f4; padding: 15px; border-radius: 4px; font-family: monospace; overflow-x: auto; }
        .env { background: #fff3cd; padding: 15px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>✅ OAuth Setup Complete!</h1>

      <div class="success">
        <h2>Authentication Successful!</h2>
        <p><strong>Instance URL:</strong> ${tokens.instance_url}</p>
        <p><strong>Access Token:</strong> ${tokens.access_token.substring(0, 20)}...</p>
        ${tokens.refresh_token ? `<p><strong>Refresh Token:</strong> ${tokens.refresh_token.substring(0, 20)}...</p>` : ''}
      </div>

      <h2>Tokens saved to: .oauth-tokens.json</h2>

      <div class="env">
        <h3>Add these to your .env file (or smithery.ai environment):</h3>
        <div class="code">
SALESFORCE_ACCESS_TOKEN=${tokens.access_token}
SALESFORCE_INSTANCE_URL=${tokens.instance_url}
${tokens.refresh_token ? `SALESFORCE_REFRESH_TOKEN=${tokens.refresh_token}` : ''}
        </div>
      </div>

      <h2>Next Steps:</h2>
      <ol>
        <li>Copy the environment variables above</li>
        <li>Add them to your .env file or smithery.ai dashboard</li>
        <li>Run: <code>node test-oauth-connection.js</code> to test</li>
        <li>Deploy to smithery.ai: <code>./deploy-smithery.sh</code></li>
      </ol>

      <p><a href="/">Setup Another Connection</a> | <a href="/test">Test Connection</a></p>
    </body>
    </html>
  `;
}

// Test connection endpoint
app.get('/test', async (req, res) => {
  try {
    const tokensFile = path.join(__dirname, '.oauth-tokens.json');
    const tokens = JSON.parse(await fs.readFile(tokensFile, 'utf8'));

    const conn = new Connection({
      instanceUrl: tokens.instance_url,
      accessToken: tokens.access_token,
      version: '59.0'
    });

    const result = await conn.query('SELECT COUNT() FROM Account');

    res.send(`
      <html><body>
        <h1>✅ Connection Test Successful!</h1>
        <p>Query: SELECT COUNT() FROM Account</p>
        <p>Result: ${result.totalSize} accounts found</p>
        <a href="/">Back to Home</a>
      </body></html>
    `);
  } catch (error) {
    res.send(`
      <html><body>
        <h1>❌ Connection Test Failed</h1>
        <p style="color: red;">${error.message}</p>
        <a href="/">Back to Home</a>
      </body></html>
    `);
  }
});

// Save tokens to file
async function saveTokens(tokens) {
  const tokensFile = path.join(__dirname, '.oauth-tokens.json');
  await fs.writeFile(tokensFile, JSON.stringify(tokens, null, 2));
  console.log(`\n✅ Tokens saved to ${tokensFile}`);

  // Also update .env file format
  const envContent = `
# OAuth Tokens (Generated ${new Date().toISOString()})
SALESFORCE_ACCESS_TOKEN=${tokens.access_token}
SALESFORCE_INSTANCE_URL=${tokens.instance_url}
${tokens.refresh_token ? `SALESFORCE_REFRESH_TOKEN=${tokens.refresh_token}` : ''}
`;

  const envFile = path.join(__dirname, '.env.oauth');
  await fs.writeFile(envFile, envContent);
  console.log(`✅ Environment variables saved to ${envFile}`);
}

// Start the server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 OAuth setup server running at http://localhost:${PORT}`);
  console.log('\n📌 Steps:');
  console.log('1. Open your browser to http://localhost:3000');
  console.log('2. Choose your authentication method');
  console.log('3. Follow the prompts to authenticate');
  console.log('4. Save the generated tokens\n');

  // Auto-open browser
  setTimeout(() => {
    open(`http://localhost:${PORT}`);
  }, 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down OAuth setup server...');
  server.close(() => {
    process.exit(0);
  });
});