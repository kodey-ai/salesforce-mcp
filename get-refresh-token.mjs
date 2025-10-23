#!/usr/bin/env node

/**
 * Script to get Salesforce Refresh Token
 *
 * Prerequisites:
 * 1. Create a Connected App in Salesforce Setup → App Manager
 * 2. Enable OAuth with callback URL: http://localhost:3000/oauth/callback
 * 3. Add scopes: "Full access (full)" and "Perform requests on your behalf at any time"
 * 4. Get the Consumer Key (Client ID) and Consumer Secret
 */

import http from 'http';
import { URL } from 'url';

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

// Get credentials from command line or environment
const CLIENT_ID = process.argv[2] || process.env.SALESFORCE_CLIENT_ID;
const CLIENT_SECRET = process.argv[3] || process.env.SALESFORCE_CLIENT_SECRET;
const LOGIN_URL = process.argv[4] || process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing credentials!\n');
  console.log('Usage: node get-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET> [LOGIN_URL]\n');
  console.log('Or set environment variables:');
  console.log('  export SALESFORCE_CLIENT_ID="your_client_id"');
  console.log('  export SALESFORCE_CLIENT_SECRET="your_client_secret"');
  console.log('  export SALESFORCE_LOGIN_URL="https://login.salesforce.com"  # or https://test.salesforce.com\n');
  process.exit(1);
}

// Create authorization URL
const authUrl = new URL(`${LOGIN_URL}/services/oauth2/authorize`);
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'full refresh_token offline_access');

console.log('\n🔐 Salesforce OAuth Flow Starting...\n');
console.log('Step 1: Open this URL in your browser:\n');
console.log(`\x1b[36m${authUrl.toString()}\x1b[0m\n`);

// Start local server to capture callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/oauth/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Authorization Failed</h1><p>Error: ${error}</p><p>Description: ${url.searchParams.get('error_description')}</p>`);
      console.error('\n❌ Authorization failed:', error);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>❌ No authorization code received</h1>');
      console.error('\n❌ No authorization code received');
      server.close();
      process.exit(1);
    }

    console.log('✓ Authorization code received');
    console.log('✓ Exchanging code for refresh token...\n');

    // Exchange code for tokens
    try {
      const tokenUrl = `${LOGIN_URL}/services/oauth2/token`;
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`${data.error}: ${data.error_description}`);
      }

      // Success!
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Success!</title></head>
          <body style="font-family: sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
            <h1>✅ Success!</h1>
            <p>Refresh token obtained. Check your terminal for details.</p>
            <p>You can close this window now.</p>
          </body>
        </html>
      `);

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🎉 SUCCESS! Refresh Token Obtained');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('Add these to your environment variables:\n');
      console.log(`export SALESFORCE_CLIENT_ID="${CLIENT_ID}"`);
      console.log(`export SALESFORCE_CLIENT_SECRET="${CLIENT_SECRET}"`);
      console.log(`\x1b[32mexport SALESFORCE_REFRESH_TOKEN="${data.refresh_token}"\x1b[0m`);
      console.log(`export SALESFORCE_INSTANCE_URL="${data.instance_url}"`);
      console.log(`export SALESFORCE_LOGIN_URL="${LOGIN_URL}"\n`);
      console.log('═══════════════════════════════════════════════════════════════\n');

      console.log('Full response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Token Exchange Failed</h1><p>${error.message}</p>`);
      console.error('\n❌ Token exchange failed:', error.message);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`✓ Callback server listening on http://localhost:${PORT}`);
  console.log('✓ Waiting for authorization...\n');

  // Try to open browser automatically
  const open = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';

  import('child_process').then(({ exec }) => {
    exec(`${open} "${authUrl.toString()}"`, (err) => {
      if (err) {
        console.log('⚠️  Could not open browser automatically. Please open the URL manually.\n');
      }
    });
  });
});
