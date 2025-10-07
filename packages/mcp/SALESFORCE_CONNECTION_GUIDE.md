# How to Connect Salesforce to Smithery.ai

## Overview
This guide explains how to connect your Salesforce instance to smithery.ai through the MCP server, enabling REST API access for SOQL queries and other Salesforce operations.

## Step 1: Set Up Salesforce Authentication

### Option A: Using Salesforce CLI (Recommended for Development)

1. **Install Salesforce CLI:**
   ```bash
   npm install -g @salesforce/cli
   ```

2. **Authenticate with your Salesforce org:**
   ```bash
   # For production or developer org
   sf auth web login --alias my-prod-org --instance-url https://login.salesforce.com

   # For sandbox
   sf auth web login --alias my-sandbox --instance-url https://test.salesforce.com

   # For custom domain
   sf auth web login --alias my-org --instance-url https://yourdomain.my.salesforce.com
   ```

3. **Verify authentication:**
   ```bash
   sf org list
   ```

4. **Get your org details:**
   ```bash
   sf org display --target-org my-org --json
   ```

### Option B: Using Connected App (Recommended for Production)

1. **Create a Connected App in Salesforce:**
   - Go to Setup → Apps → App Manager
   - Click "New Connected App"
   - Fill in the required fields:
     - Connected App Name: `Smithery MCP Integration`
     - API Name: `Smithery_MCP_Integration`
     - Contact Email: your email
   - Enable OAuth Settings:
     - Callback URL: `https://smithery.ai/oauth/callback`
     - Selected OAuth Scopes:
       - Access and manage your data (api)
       - Perform requests on your behalf at any time (refresh_token, offline_access)
       - Access your basic information (id, profile, email, address, phone)
       - Access custom permissions (custom_permissions)
   - Save the app

2. **Get your credentials:**
   - After saving, note down:
     - Consumer Key (Client ID)
     - Consumer Secret (Client Secret)
   - You'll also need:
     - Your Salesforce username
     - Your Salesforce password + security token

### Option C: Using Access Token (Quick Setup)

1. **Generate an access token:**
   ```bash
   curl https://login.salesforce.com/services/oauth2/token \
     -d "grant_type=password" \
     -d "client_id=YOUR_CONSUMER_KEY" \
     -d "client_secret=YOUR_CONSUMER_SECRET" \
     -d "username=YOUR_USERNAME" \
     -d "password=YOUR_PASSWORD_AND_SECURITY_TOKEN"
   ```

2. **Save the returned access_token and instance_url**

## Step 2: Configure Environment Variables

### For Local Development

Create a `.env` file in `packages/mcp/`:
```env
# Salesforce Authentication
SALESFORCE_ORG_USERNAME=your-org@example.com
SALESFORCE_INSTANCE_URL=https://your-instance.my.salesforce.com

# For Connected App authentication (optional)
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_USERNAME=your_username
SALESFORCE_PASSWORD=your_password_and_token

# For direct token authentication (optional)
SALESFORCE_ACCESS_TOKEN=your_access_token
SALESFORCE_REFRESH_TOKEN=your_refresh_token

# Server Configuration
SALESFORCE_TOOLSETS=all
SALESFORCE_ALLOW_ALL_ORGS=false
SALESFORCE_DEBUG=false
```

### For Smithery.ai Deployment

These will be configured in the smithery.ai dashboard after deployment.

## Step 3: Update the REST API Wrapper for Authentication

We need to update the REST API wrapper to handle authentication properly:

```typescript
// Add to src/rest-api-wrapper.ts

import { AuthInfo, Connection as SFConnection } from '@salesforce/core';

private async getAuthenticatedConnection(): Promise<SFConnection> {
  // Method 1: Using existing CLI authentication
  if (process.env.SALESFORCE_ORG_USERNAME) {
    const authInfo = await AuthInfo.create({ username: process.env.SALESFORCE_ORG_USERNAME });
    return await Connection.create({ authInfo });
  }

  // Method 2: Using access token
  if (process.env.SALESFORCE_ACCESS_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
    return new Connection({
      instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
      accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
      version: '59.0'
    });
  }

  // Method 3: Using username/password flow
  if (process.env.SALESFORCE_USERNAME && process.env.SALESFORCE_PASSWORD) {
    const conn = new Connection({
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    });

    await conn.login(
      process.env.SALESFORCE_USERNAME,
      process.env.SALESFORCE_PASSWORD
    );

    return conn;
  }

  throw new Error('No valid Salesforce authentication configured');
}
```

## Step 4: Deploy to Smithery.ai

### 1. Prepare for Deployment

```bash
cd packages/mcp

# Install dependencies
npm install

# Build the project
npm run build

# Test locally (optional)
node bin/run.js --rest-api --orgs DEFAULT_TARGET_ORG --toolsets all
```

### 2. Deploy Using Smithery CLI

```bash
# Login to Smithery
smithery login

# Deploy
smithery deploy .
```

### 3. Configure on Smithery.ai Dashboard

After deployment:

1. **Go to your server on smithery.ai:**
   - Visit https://smithery.ai/servers
   - Find your deployed server

2. **Configure Environment Variables:**
   - Click on "Settings" or "Environment"
   - Add your Salesforce credentials:
     ```
     SALESFORCE_ORG_USERNAME=your-org@example.com
     SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
     SALESFORCE_CLIENT_ID=your_consumer_key
     SALESFORCE_CLIENT_SECRET=your_consumer_secret
     ```

3. **Set up API Keys (for REST access):**
   - Generate an API key in smithery.ai
   - This key will be used to authenticate REST API calls

## Step 5: Test the Connection

### Test Health Endpoint
```bash
curl https://your-server.smithery.ai/health
```

### Test SOQL Query
```bash
curl -X POST https://your-server.smithery.ai/api/soql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SMITHERY_API_KEY" \
  -d '{
    "query": "SELECT Id, Name FROM Account LIMIT 5"
  }'
```

### Test with Multiple Orgs
```bash
curl -X POST https://your-server.smithery.ai/api/soql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SMITHERY_API_KEY" \
  -d '{
    "query": "SELECT COUNT() FROM Contact",
    "orgUsername": "sandbox-org@example.com"
  }'
```

## Step 6: Use with AI Agents

### Configure Claude to Use Your Server

In Claude's configuration:
```json
{
  "mcp_servers": {
    "salesforce": {
      "endpoint": "https://your-server.smithery.ai",
      "api_key": "your-smithery-api-key",
      "capabilities": ["soql", "apex", "metadata"]
    }
  }
}
```

### Example AI Agent Query
"Query Salesforce to find all Accounts created in the last 30 days with revenue over $1M"

The AI agent will:
1. Connect to your MCP server
2. Construct the SOQL query
3. Execute via REST API
4. Return formatted results

## Security Best Practices

### 1. Use Least Privilege Principle
- Create a dedicated Salesforce user for the integration
- Assign only necessary permissions
- Use Permission Sets for granular control

### 2. Rotate Credentials Regularly
- Refresh OAuth tokens periodically
- Update Connected App credentials
- Monitor access logs

### 3. Implement IP Restrictions
In Salesforce:
- Setup → Network Access
- Add smithery.ai IP ranges
- Restrict API access to known IPs

### 4. Use Field-Level Security
- Limit field access in Salesforce profiles
- Use Shield Platform Encryption for sensitive data
- Implement data masking where appropriate

### 5. Monitor and Audit
- Enable Salesforce Event Monitoring
- Review API usage regularly
- Set up alerts for unusual activity

## Troubleshooting Common Issues

### Issue 1: Authentication Failures
```
Error: INVALID_LOGIN: Invalid username, password, security token
```
**Solution:**
- Verify username and password
- Append security token to password
- Check if IP is whitelisted

### Issue 2: Insufficient Privileges
```
Error: INSUFFICIENT_ACCESS: User does not have access to this object
```
**Solution:**
- Check user profile permissions
- Verify object-level access
- Add necessary Permission Sets

### Issue 3: API Limit Exceeded
```
Error: REQUEST_LIMIT_EXCEEDED: API calls limit exceeded
```
**Solution:**
- Implement caching in the MCP server
- Use bulk API for large operations
- Monitor API usage in Salesforce

### Issue 4: Connection Timeout
```
Error: ECONNRESET: Connection reset by peer
```
**Solution:**
- Check network connectivity
- Verify firewall rules
- Increase timeout settings

### Issue 5: CORS Issues
```
Error: CORS policy blocked request
```
**Solution:**
- Configure CORS in Salesforce
- Add smithery.ai to trusted sites
- Use proper headers in requests

## Advanced Configuration

### Enable Caching
```javascript
// In rest-api-wrapper.ts
import NodeCache from 'node-cache';

class RestApiWrapper {
  private cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

  private async cachedQuery(query: string, org: string) {
    const cacheKey = `${org}:${query}`;
    const cached = this.cache.get(cacheKey);

    if (cached) return cached;

    const result = await this.executeQuery(query, org);
    this.cache.set(cacheKey, result);
    return result;
  }
}
```

### Implement Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

### Add Request Logging
```javascript
import morgan from 'morgan';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'api.log' })
  ]
});

app.use(morgan('combined', { stream: { write: message => logger.info(message) }}));
```

## Support Resources

- **Salesforce Developer Documentation:** https://developer.salesforce.com/docs
- **Smithery.ai Documentation:** https://smithery.ai/docs
- **MCP Protocol Specification:** https://modelcontextprotocol.org
- **Salesforce Trailhead:** https://trailhead.salesforce.com
- **Community Support:** https://github.com/salesforcecli/mcp/discussions