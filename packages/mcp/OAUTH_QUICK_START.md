# 🚀 OAuth Quick Start - Connect Salesforce in 5 Minutes

## Step 1: Create Connected App in Salesforce (2 minutes)

1. **Login to Salesforce** → Go to **Setup** (⚙️ gear icon)

2. Search for **"App Manager"** in Quick Find box

3. Click **"New Connected App"** button

4. Fill in these fields:
   ```
   Connected App Name: Smithery MCP Integration
   API Name: Smithery_MCP_Integration
   Contact Email: your-email@company.com
   ```

5. Check ☑️ **Enable OAuth Settings**

6. **Callback URL** - Add this:
   ```
   http://localhost:3000/oauth/callback
   ```

7. **OAuth Scopes** - Select these (use the arrow to move them to "Selected"):
   - Access and manage your data (api)
   - Perform requests on your behalf at any time (refresh_token, offline_access)

8. Click **Save** → **Continue**

9. **IMPORTANT**: Wait 2-10 minutes for activation ⏰

## Step 2: Get Your OAuth Credentials (1 minute)

1. After saving, click **"Manage Consumer Details"**

2. Verify your identity (Salesforce sends a code to your email)

3. Copy these two values:
   - **Consumer Key**: `3MVG9...` (this is your Client ID)
   - **Consumer Secret**: `1234...` (this is your Client Secret)

## Step 3: Configure Your Project (1 minute)

1. Create your `.env` file:
   ```bash
   cd packages/mcp
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   # OAuth Credentials (from Step 2)
   SALESFORCE_CLIENT_ID=paste_your_consumer_key_here
   SALESFORCE_CLIENT_SECRET=paste_your_consumer_secret_here

   # Your Salesforce Login
   SALESFORCE_USERNAME=your-email@company.com
   SALESFORCE_PASSWORD=YourPasswordPlusSecurityToken

   # Login URL
   SALESFORCE_LOGIN_URL=https://login.salesforce.com
   # Use https://test.salesforce.com for sandboxes
   ```

   **Note**: Password = Your Salesforce password + Security token (no space)
   - Get security token: Setup → Reset My Security Token → Check email

## Step 4: Get OAuth Tokens (1 minute)

Install packages and run OAuth setup:
```bash
# Install dependencies
npm install open

# Run interactive OAuth setup
node oauth-setup.js
```

This will:
1. Open a browser window
2. Show you 3 authentication options
3. Choose **"Use Password Flow"** (easiest)
4. Get your access token automatically

## Step 5: Test Your Connection (30 seconds)

```bash
node test-oauth-connection.js
```

You should see:
```
✅ OAuth Connection Test Successful!
✅ Accounts: X records
✅ Contacts: Y records
```

## 🎉 That's It! You're Connected!

Your Salesforce is now connected via OAuth. Deploy to smithery.ai:

```bash
./deploy-smithery.sh
```

## 📝 What Just Happened?

1. **Connected App**: Created a secure bridge between Salesforce and your server
2. **OAuth Credentials**: Got the keys to authenticate
3. **Access Token**: Obtained a temporary pass to access Salesforce data
4. **Ready to Deploy**: Everything configured for smithery.ai

## 🆘 Troubleshooting

### "Invalid Grant" Error?
- Add security token to password (no space between)
- Wait 2-10 minutes for Connected App to activate
- Check if using correct login URL (production vs sandbox)

### "Invalid Client" Error?
- Double-check Consumer Key and Secret
- Make sure Connected App is saved and activated

### Need Your Security Token?
1. Salesforce → Setup
2. Quick Find → "Reset My Security Token"
3. Click "Reset Security Token"
4. Check your email

## 🔒 Security Notes

- Never commit `.env` file to git
- Keep your Consumer Secret safe
- Tokens expire - the server handles refresh automatically
- Use a dedicated integration user in production

---

**Need the full guide?** See `OAUTH_SETUP_GUIDE.md` for advanced options