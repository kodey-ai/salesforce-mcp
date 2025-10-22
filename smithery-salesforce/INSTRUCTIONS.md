# 🚀 Smithery Salesforce MCP Server - Complete Setup

## What We've Built

A **Smithery-compatible MCP server** for Salesforce with:
- ✅ **API Key Authentication** - Secure connection using Salesforce access tokens
- ✅ **Read Operation** - Query any Salesforce object with SOQL or filters
- ✅ **Insert Operation** - Insert single or multiple records
- ✅ **Full Smithery SDK Integration** - Ready for deployment

## Project Structure
```
smithery-salesforce/
├── src/
│   └── index.ts          # Main server implementation
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── README.md            # Documentation
├── .gitignore           # Git ignore file
├── .env.example         # Example environment variables
├── test-local.sh        # Local testing script
└── deploy.md            # Deployment guide
```

## Quick Start

### 1. Install Dependencies
```bash
cd smithery-salesforce
npm install
```

### 2. Get Salesforce Access Token

**Option A: Quick Test Token (Dev Only)**
```bash
curl https://login.salesforce.com/services/oauth2/token \
  -d "grant_type=password" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD_AND_SECURITY_TOKEN"
```

**Option B: OAuth Flow (Recommended)**
- Create Connected App in Salesforce
- Use OAuth 2.0 authorization flow

### 3. Test Locally
```bash
./test-local.sh
# Or directly:
npm run dev
```

This opens Smithery Playground where you can:
1. Enter your Salesforce API credentials
2. Test read and insert operations
3. See real-time results

## Available Operations

### Read Records
```typescript
// Example: Read top 5 Accounts
{
  "objectName": "Account",
  "fields": ["Name", "Industry", "AnnualRevenue"],
  "limit": 5
}

// Example: Query with filter
{
  "objectName": "Contact",
  "query": "Email != null",
  "fields": ["FirstName", "LastName", "Email"]
}
```

### Insert Records
```typescript
// Example: Insert single record
{
  "objectName": "Contact",
  "records": [
    {
      "FirstName": "John",
      "LastName": "Doe",
      "Email": "john@example.com"
    }
  ]
}

// Example: Bulk insert
{
  "objectName": "Lead",
  "records": [
    { "Company": "Acme", "LastName": "Smith" },
    { "Company": "TechCo", "LastName": "Jones" }
  ],
  "allOrNone": true  // Rollback if any fail
}
```

## Deploy to Smithery

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Smithery Salesforce MCP Server"
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

### Step 2: Deploy on Smithery
1. Go to https://smithery.ai/new
2. Click "Deploy"
3. Select your GitHub repository
4. Done! 🎉

## Configure for Claude Desktop

After deployment, add to Claude Desktop config:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "smithery-salesforce",
        "--config",
        "{\"salesforceApiKey\":\"YOUR_TOKEN\",\"salesforceInstanceUrl\":\"https://your-instance.my.salesforce.com\"}"
      ]
    }
  }
}
```

## Example Claude Prompts

Once configured, you can ask Claude:

1. "Read all accounts with annual revenue over 1 million"
2. "Show me the latest 10 opportunities in closing stage"
3. "Insert a new contact for John Smith at Acme Corp"
4. "Create 5 test leads for our demo"

## Security Notes

⚠️ **Important:**
- Never commit API keys to Git
- Use environment variables in production
- Rotate tokens regularly
- Use OAuth instead of username/password
- Apply IP restrictions in Salesforce

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invalid Session | Generate new access token |
| Object not found | Check API name (case-sensitive) |
| Permission denied | Verify user permissions in Salesforce |
| Connection failed | Check instance URL format |

## Next Steps

1. **Test locally** with `npm run dev`
2. **Customize** the operations in `src/index.ts`
3. **Deploy** to Smithery via GitHub
4. **Share** with your team!

---

**Ready to test?** Run:
```bash
cd smithery-salesforce
npm install
npm run dev
```

The Smithery Playground will open automatically! 🚀