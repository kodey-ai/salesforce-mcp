# Smithery Salesforce MCP Server

A Model Context Protocol (MCP) server for Salesforce operations, built with Smithery SDK. This server provides secure read and insert operations for Salesforce objects using API key authentication.

## Features

- **Salesforce Read**: Query and retrieve records from any Salesforce object
- **Salesforce Insert**: Insert single or multiple records into Salesforce objects
- **API Key Authentication**: Secure connection using Salesforce access tokens
- **Flexible Queries**: Support for both SOQL queries and simple filters

## Configuration

The server requires the following configuration parameters:

- `salesforceApiKey`: Your Salesforce Access Token
- `salesforceInstanceUrl`: Your Salesforce instance URL (e.g., https://yourdomain.my.salesforce.com)
- `apiVersion`: Salesforce API version (default: "59.0")

## Getting a Salesforce Access Token

### Option 1: OAuth Flow (Recommended)
1. Create a Connected App in Salesforce Setup
2. Use OAuth 2.0 flow to obtain an access token
3. Store the access token securely

### Option 2: Username-Password Flow (Development Only)
```bash
curl https://login.salesforce.com/services/oauth2/token \
  -d "grant_type=password" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD_AND_SECURITY_TOKEN"
```

## Available Tools

### 1. salesforce_read
Read records from Salesforce objects.

**Parameters:**
- `objectName` (required): Salesforce object name (e.g., Account, Contact, Lead)
- `query`: SOQL query or filter conditions
- `fields`: Array of fields to retrieve
- `limit`: Maximum number of records (default: 10)

**Examples:**
```json
{
  "objectName": "Account",
  "fields": ["Name", "Industry", "AnnualRevenue"],
  "limit": 5
}
```

### 2. salesforce_insert
Insert records into Salesforce objects.

**Parameters:**
- `objectName` (required): Salesforce object name
- `records` (required): Array of records to insert
- `allOrNone`: If true, all inserts must succeed or all will be rolled back

**Examples:**
```json
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
```

## Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

This will start the server with hot-reload and create a tunnel for testing in the Smithery Playground.

### Build for Production
```bash
npm run build
```

## Deployment

1. Push to GitHub repository
2. Go to https://smithery.ai/new
3. Click "Deploy" and select your repository
4. Configure environment variables for production

## Testing in Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "smithery-salesforce",
        "--salesforceApiKey", "YOUR_ACCESS_TOKEN",
        "--salesforceInstanceUrl", "https://yourdomain.my.salesforce.com"
      ]
    }
  }
}
```

## Security Notes

- Never commit API keys to version control
- Use environment variables for production deployments
- Rotate access tokens regularly
- Use OAuth flows for production applications
- Implement IP restrictions in Salesforce for added security

## License

MIT