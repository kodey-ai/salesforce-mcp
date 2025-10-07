# 🔐 Salesforce OAuth2 Setup Guide for Smithery.ai

This guide will walk you through setting up OAuth2 authentication to connect your Salesforce instance to smithery.ai securely.

## Step 1: Create a Connected App in Salesforce

### 1.1 Navigate to App Manager
1. Log into your Salesforce org
2. Go to **Setup** (gear icon in top right)
3. In Quick Find, search for "App Manager"
4. Click **App Manager**
5. Click **New Connected App** button

### 1.2 Configure Basic Information
Fill in these required fields:
- **Connected App Name**: `Smithery MCP Integration`
- **API Name**: `Smithery_MCP_Integration`
- **Contact Email**: your-email@company.com
- **Description**: Integration for Salesforce MCP Server on smithery.ai

### 1.3 Enable OAuth Settings
1. Check **Enable OAuth Settings**
2. **Callback URL**: Add these URLs (one per line):
   ```
   http://localhost:3000/oauth/callback
   https://your-server.smithery.ai/oauth/callback
   https://smithery.ai/oauth/callback
   ```

3. **Selected OAuth Scopes** - Add these scopes:
   - `Access and manage your data (api)`
   - `Access your basic information (id, profile, email, address, phone)`
   - `Perform requests on your behalf at any time (refresh_token, offline_access)`
   - `Access custom permissions (custom_permissions)`
   - `Access and manage your Chatter data (chatter_api)` (optional)
   - `Full access (full)` (optional, for admin operations)

### 1.4 Configure Additional Settings
- **Require Secret for Web Server Flow**: ✅ Checked
- **Require Secret for Refresh Token Flow**: ✅ Checked
- **Enable Client Credentials Flow**: ✅ Checked (optional, for server-to-server)

### 1.5 Save and Wait
1. Click **Save**
2. Click **Continue**
3. **IMPORTANT**: Wait 2-10 minutes for the app to be activated

## Step 2: Get Your OAuth Credentials

After saving, you'll see the Connected App details page.

### 2.1 View Consumer Details
1. Click **Manage Consumer Details**
2. You may need to verify your identity (Salesforce will send a verification code)
3. Copy these values:
   - **Consumer Key** (also called Client ID)
   - **Consumer Secret** (also called Client Secret)

Keep these safe - you'll need them for configuration!

## Step 3: Configure OAuth Policies (Optional but Recommended)

### 3.1 Edit Policies
1. On the Connected App page, click **Edit Policies**

### 3.2 Configure OAuth Policies
- **Permitted Users**: `All users may self-authorize`
- **IP Relaxation**: `Relax IP restrictions` (for development)
- **Refresh Token Policy**: `Refresh token is valid until revoked`
- **Timeout Value**: Set to your preference (e.g., 2 hours)

### 3.3 Save Policies
Click **Save**

## Step 4: Configure Your Local Environment

### 4.1 Create .env file
Create a `.env` file in `packages/mcp/`:

```env
# OAuth2 Configuration
SALESFORCE_CLIENT_ID=3MVG9...your_consumer_key_here
SALESFORCE_CLIENT_SECRET=1234567890ABCDEF...your_consumer_secret_here

# User Credentials (for initial token generation)
SALESFORCE_USERNAME=your-email@company.com
SALESFORCE_PASSWORD=YourPasswordPlusSecurityToken

# Salesforce URLs
SALESFORCE_LOGIN_URL=https://login.salesforce.com
# Use https://test.salesforce.com for sandboxes

# API Configuration
SALESFORCE_API_VERSION=59.0

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4.2 For Production/Custom Domain
If using MyDomain:
```env
SALESFORCE_LOGIN_URL=https://yourdomain.my.salesforce.com
```

## Step 5: Generate Access Token

### Option A: Using Our OAuth Helper Script

I'll create a helper script for you:

```bash
node oauth-setup.js
```

This will:
1. Start a local OAuth server
2. Open your browser for authorization
3. Capture the tokens
4. Save them securely

### Option B: Using Postman

1. Create a new POST request to:
   ```
   https://login.salesforce.com/services/oauth2/token
   ```

2. Set Body (x-www-form-urlencoded):
   - `grant_type`: `password`
   - `client_id`: Your Consumer Key
   - `client_secret`: Your Consumer Secret
   - `username`: Your Salesforce username
   - `password`: Your password + security token

3. Send request and save the response:
   ```json
   {
     "access_token": "00D...",
     "instance_url": "https://yourorg.my.salesforce.com",
     "id": "https://login.salesforce.com/id/...",
     "token_type": "Bearer",
     "issued_at": "1234567890",
     "signature": "..."
   }
   ```

### Option C: Using cURL

```bash
curl -X POST https://login.salesforce.com/services/oauth2/token \
  -d "grant_type=password" \
  -d "client_id=YOUR_CONSUMER_KEY" \
  -d "client_secret=YOUR_CONSUMER_SECRET" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD_AND_TOKEN"
```

## Step 6: Configure OAuth in the MCP Server

The server now supports multiple OAuth flows:

### 6.1 Password Flow (Simplest)
Already configured in your `.env`:
```env
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_USERNAME=your_username
SALESFORCE_PASSWORD=your_password_and_token
```

### 6.2 Refresh Token Flow (Recommended)
After initial authentication, save the refresh token:
```env
SALESFORCE_REFRESH_TOKEN=your_refresh_token
SALESFORCE_INSTANCE_URL=https://yourorg.my.salesforce.com
```

### 6.3 Authorization Code Flow (Most Secure)
For web applications with user interaction.

## Step 7: Test OAuth Connection

```bash
# Test your OAuth setup
node test-oauth-connection.js
```

## Step 8: Deploy to Smithery with OAuth

### 8.1 Update smithery.yaml
The smithery.yaml is already configured for OAuth environment variables.

### 8.2 Deploy
```bash
./deploy-smithery.sh
```

### 8.3 Configure on Smithery Dashboard
After deployment:
1. Go to https://smithery.ai/servers
2. Find your server
3. Go to Environment/Settings
4. Add your OAuth credentials:
   - `SALESFORCE_CLIENT_ID`
   - `SALESFORCE_CLIENT_SECRET`
   - `SALESFORCE_USERNAME`
   - `SALESFORCE_PASSWORD`

## Step 9: Using the REST API with OAuth

### 9.1 Direct API Call
```bash
curl -X POST https://your-server.smithery.ai/api/soql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SMITHERY_API_KEY" \
  -d '{
    "query": "SELECT Id, Name FROM Account LIMIT 10"
  }'
```

### 9.2 With Specific Org
```bash
curl -X POST https://your-server.smithery.ai/api/soql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SMITHERY_API_KEY" \
  -d '{
    "query": "SELECT Id, Name FROM Contact WHERE AccountId != null",
    "orgUsername": "production@company.com"
  }'
```

## Security Best Practices for OAuth

### 1. Token Management
- Store tokens securely (never in code)
- Implement token refresh logic
- Set appropriate token expiration times

### 2. Scope Limitation
- Request only necessary scopes
- Use least privilege principle
- Review scope usage regularly

### 3. IP Whitelisting
1. Go to Setup → Network Access
2. Add trusted IP ranges
3. For production, use strict IP policies

### 4. Connected App Monitoring
- Review Connected App usage
- Monitor OAuth login history
- Set up login alerts

### 5. Refresh Token Security
```javascript
// The server automatically handles refresh
if (tokenExpired) {
  const newToken = await refreshAccessToken(refreshToken);
  // Token automatically refreshed
}
```

## Troubleshooting OAuth Issues

### Error: "invalid_grant"
**Causes:**
- Incorrect username/password
- Missing security token
- IP not whitelisted
- Connected App not activated (wait 2-10 minutes)

**Solution:**
```bash
# Reset security token
# Setup → My Personal Information → Reset Security Token
```

### Error: "invalid_client_id"
**Causes:**
- Wrong Consumer Key
- Connected App not activated
- Wrong login URL (production vs sandbox)

### Error: "redirect_uri_mismatch"
**Solution:**
Add your callback URL to Connected App:
```
http://localhost:3000/oauth/callback
https://your-server.smithery.ai/oauth/callback
```

### Error: "insufficient_scope"
**Solution:**
Add required scopes to Connected App:
- api
- refresh_token
- offline_access

## Advanced OAuth Configuration

### Implement JWT Bearer Flow (Most Secure)

1. **Generate RSA Key Pair:**
```bash
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr
openssl x509 -req -sha256 -days 365 -in server.csr -signkey server.key -out server.crt
```

2. **Upload Certificate to Connected App:**
- Edit Connected App
- Enable "Use digital signatures"
- Upload server.crt

3. **Configure JWT in .env:**
```env
SALESFORCE_JWT_KEY_FILE=./server.key
SALESFORCE_JWT_CLIENT_ID=your_consumer_key
SALESFORCE_JWT_USERNAME=your_username
```

### OAuth Token Caching
The server implements automatic token caching and refresh:
```javascript
// Tokens are automatically cached and refreshed
// No manual intervention needed
```

## Testing OAuth Flows

### Test Password Flow
```bash
curl -X POST http://localhost:3000/api/test-oauth \
  -H "Content-Type: application/json" \
  -d '{
    "flow": "password"
  }'
```

### Test Refresh Token
```bash
curl -X POST http://localhost:3000/api/test-oauth \
  -H "Content-Type: application/json" \
  -d '{
    "flow": "refresh"
  }'
```

### Test JWT Bearer
```bash
curl -X POST http://localhost:3000/api/test-oauth \
  -H "Content-Type: application/json" \
  -d '{
    "flow": "jwt"
  }'
```

## OAuth Endpoints Reference

### Salesforce OAuth Endpoints
- **Authorization**: `https://login.salesforce.com/services/oauth2/authorize`
- **Token**: `https://login.salesforce.com/services/oauth2/token`
- **Revoke**: `https://login.salesforce.com/services/oauth2/revoke`
- **UserInfo**: `https://login.salesforce.com/services/oauth2/userinfo`
- **Introspect**: `https://login.salesforce.com/services/oauth2/introspect`

### For Sandboxes
Replace `login.salesforce.com` with `test.salesforce.com`

### For MyDomain
Use `https://yourdomain.my.salesforce.com`

## Next Steps

1. ✅ Create Connected App in Salesforce
2. ✅ Configure OAuth settings
3. ✅ Get Consumer Key and Secret
4. ✅ Update .env with OAuth credentials
5. ✅ Test OAuth connection
6. ✅ Deploy to smithery.ai
7. ✅ Test REST API endpoints

## Support Resources

- [Salesforce OAuth Documentation](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
- [Connected Apps Guide](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_oauth_and_connected_apps.htm)
- [OAuth Scopes Reference](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_scopes.htm)
- [Smithery Documentation](https://smithery.ai/docs)