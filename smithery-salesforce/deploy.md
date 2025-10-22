# Deployment Guide for Smithery Salesforce Server

## Quick Deploy Steps

### 1. Prepare Your Code
```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Initial Smithery Salesforce server"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 3. Deploy on Smithery

1. Go to https://smithery.ai/new
2. Click "Deploy"
3. Connect your GitHub repository
4. Smithery will automatically detect your configuration

### 4. Configure in Production

When users install your server, they'll be prompted to provide:
- `salesforceApiKey`: Their Salesforce access token
- `salesforceInstanceUrl`: Their Salesforce instance URL
- `apiVersion`: API version (optional, defaults to "59.0")

## Usage After Deployment

### For Claude Desktop Users:
```json
{
  "mcpServers": {
    "smithery-salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "smithery-salesforce",
        "--config",
        "{\"salesforceApiKey\":\"YOUR_TOKEN\",\"salesforceInstanceUrl\":\"https://your-domain.my.salesforce.com\"}"
      ]
    }
  }
}
```

### Via Smithery CLI:
```bash
smithery install smithery-salesforce --config '{"salesforceApiKey":"YOUR_TOKEN","salesforceInstanceUrl":"https://your-domain.my.salesforce.com"}'
```

## Example Prompts for Users

After installation, users can:

1. **Read Accounts:**
   "Read the top 5 accounts from Salesforce with their Name and Industry fields"

2. **Query with Filter:**
   "Get all contacts where Email is not null, show FirstName, LastName, and Email"

3. **Insert Record:**
   "Insert a new contact: John Doe, john.doe@example.com"

4. **Bulk Insert:**
   "Insert multiple leads with the following data..."

## Security Best Practices

1. **Never commit credentials** - Use environment variables or secure configuration
2. **Use OAuth tokens** - Prefer OAuth access tokens over username/password
3. **Set token expiry** - Use short-lived tokens when possible
4. **IP restrictions** - Configure IP allowlisting in Salesforce
5. **Minimal permissions** - Grant only necessary object permissions to the integration user

## Troubleshooting

### Common Issues:

1. **Invalid Session ID:**
   - Token has expired - generate a new access token
   - Incorrect instance URL - verify the Salesforce domain

2. **Object Not Found:**
   - Check object API name (case-sensitive)
   - Verify user has access to the object

3. **Field Not Found:**
   - Verify field API names
   - Check field-level security permissions

## Support

- Report issues: [GitHub Issues]
- Documentation: This README
- Smithery Platform: https://smithery.ai