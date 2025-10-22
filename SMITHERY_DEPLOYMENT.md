# Deploying Salesforce MCP Server to Smithery

This guide walks you through deploying the Salesforce MCP Server to the Smithery platform.

## Prerequisites

1. **Smithery Account**: Create an account at [smithery.ai](https://smithery.ai) if you haven't already
2. **Node.js**: Ensure Node.js v18+ is installed
3. **Salesforce Auth**: Have at least one Salesforce org authorized locally

## Deployment Steps

### 1. Build the Project Locally
```bash
# Install dependencies
npm install

# Build all packages
npm run build
```

### 2. Configure smithery.json
The `smithery.json` file has been created with the following configuration:
- Entry point: `packages/mcp/bin/run.js`
- Parameters for `orgs` and `toolsets` configuration
- Build steps for installation and compilation

### 3. Deploy to Smithery

#### Option A: Deploy via GitHub (Recommended)
1. Push your code to a GitHub repository
2. Go to [smithery.ai](https://smithery.ai)
3. Click "New Server" and connect your GitHub repository
4. Smithery will automatically detect the `smithery.json` configuration
5. Configure environment variables if needed
6. Click "Deploy"

#### Option B: Deploy via CLI
```bash
# Install Smithery CLI
npm install -g @smithery/cli

# Login to Smithery
smithery login

# Deploy from the project root
smithery deploy
```

## Configuration Parameters

When deploying, you'll need to configure:

### Required Parameters:
- **orgs**: Comma-separated list of authorized org aliases or usernames
  - Example: `my-org,dev-sandbox,production`
  - Default: `DEFAULT_TARGET_ORG`

### Optional Parameters:
- **toolsets**: Comma-separated list of toolsets to enable
  - Options: `all`, `core`, `dx`, `agent`, `lwc`, `aura`, `mobile`, `devops`
  - Default: `all`

## Usage After Deployment

Once deployed, you can use your Smithery MCP server URL in any MCP client:

### Example for VS Code:
```json
{
  "servers": {
    "Salesforce DX (Smithery)": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@smithery/client",
        "connect",
        "https://your-server.smithery.ai",
        "--orgs", "your-org-alias",
        "--toolsets", "all"
      ]
    }
  }
}
```

### Example for Claude Desktop:
```json
{
  "mcpServers": {
    "salesforce-dx": {
      "url": "https://your-server.smithery.ai",
      "params": {
        "orgs": "your-org-alias",
        "toolsets": "all"
      }
    }
  }
}
```

## Security Considerations

1. **Org Access**: Only allowlist orgs you want the MCP server to access
2. **Authentication**: Smithery uses secure OAuth for authentication
3. **Secrets Management**: Never commit authentication tokens to your repository
4. **Environment Variables**: Use Smithery's secure environment variable management

## Troubleshooting

### Build Failures
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v18+)
- Clear cache: `npm cache clean --force`

### Deployment Issues
- Verify `smithery.json` is valid JSON
- Check that the entry point path is correct
- Ensure all required files are included in your repository

### Runtime Errors
- Verify Salesforce orgs are properly authorized locally before deployment
- Check that org aliases match between local and deployment configuration
- Review server logs in the Smithery dashboard

## Support

- Smithery Documentation: [docs.smithery.ai](https://docs.smithery.ai)
- Salesforce MCP Issues: [GitHub Issues](https://github.com/salesforcecli/mcp/issues)
- Smithery Support: support@smithery.ai