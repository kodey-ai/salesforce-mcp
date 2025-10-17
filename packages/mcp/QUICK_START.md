# 🚀 Quick Start: Connect Salesforce to Smithery.ai

## 3 Simple Steps to Deploy

### Step 1: Set Up Salesforce Credentials

Create a `.env` file in `packages/mcp/`:

```bash
# Copy the template
cp .env.example .env

# Edit with your credentials
nano .env
```

Add your Salesforce credentials (choose ONE method):

#### Option A: Simple Username/Password (Easiest)
```env
SALESFORCE_USERNAME=your-email@company.com
SALESFORCE_PASSWORD=YourPassword123SecretToken456
SALESFORCE_LOGIN_URL=https://login.salesforce.com
```

**Note:** Password = Your Salesforce password + Security Token (no space between them)

To get your security token:
1. Login to Salesforce
2. Go to Settings → Reset My Security Token
3. Check your email

#### Option B: Access Token (If you have one)
```env
SALESFORCE_ACCESS_TOKEN=00D...your_token_here
SALESFORCE_INSTANCE_URL=https://yourinstance.my.salesforce.com
```

### Step 2: Test Your Connection

```bash
# Install dependencies
npm install

# Test connection
node test-salesforce-connection.js
```

If successful, you'll see:
```
✅ Successfully connected to Salesforce!
✅ Query successful! Found X accounts
```

### Step 3: Deploy to Smithery

```bash
# Run the deployment script
./deploy-smithery.sh

# When prompted:
# 1. Enter the same credentials from your .env
# 2. Choose option 1 (Smithery CLI deployment)
```

## 🎯 That's It!

Your Salesforce MCP server is now deployed to smithery.ai with REST API endpoints:

### Test Your Deployed API

```bash
# Health check
curl https://your-server.smithery.ai/health

# Query Salesforce
curl -X POST https://your-server.smithery.ai/api/soql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT Id, Name FROM Account LIMIT 5"
  }'
```

## 📚 More Resources

- Full guide: `SALESFORCE_CONNECTION_GUIDE.md`
- Deployment details: `SMITHERY_DEPLOYMENT.md`
- Troubleshooting: See error messages in test script

## 🆘 Common Issues

### "INVALID_LOGIN" Error
- Add your security token to the password
- Check if using correct login URL (production vs sandbox)

### "No Salesforce CLI found"
- That's OK! The REST API wrapper will use environment variables instead

### Can't find smithery CLI
```bash
npm install -g @smithery/cli
```

## 🔒 Security Tips

1. Never commit `.env` file to git
2. Use a dedicated Salesforce user for integration
3. Set minimum required permissions
4. Rotate credentials regularly

---

Need help? Check the detailed guides or raise an issue on GitHub.