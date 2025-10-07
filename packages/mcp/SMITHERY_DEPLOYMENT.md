# Salesforce MCP Server - Smithery.ai Deployment Guide

This guide will help you deploy the Salesforce MCP Server to smithery.ai with REST API support for executing SOQL queries and other Salesforce operations.

## Overview

The Salesforce MCP Server provides Model Context Protocol access to Salesforce instances, allowing AI agents to:
- Execute SOQL queries
- Run Apex code
- Deploy and retrieve metadata
- Create scratch orgs
- Manage users and permissions
- Run tests

## Prerequisites

1. **Node.js** (v18 or later)
2. **Salesforce CLI** authenticated with your org(s)
3. **Smithery CLI**: `npm install -g @smithery/cli`
4. **Git** and a GitHub repository (for Git-based deployment)

## Configuration Files

### 1. smithery.yaml
The main configuration file for smithery.ai deployment. This file defines:
- Server runtime and entrypoint
- Required environment variables
- Available capabilities
- Deployment settings

### 2. REST API Wrapper
Located at `src/rest-api-wrapper.ts`, this provides HTTP endpoints for:
- `/health` - Health check endpoint
- `/api/soql` - Execute SOQL queries
- `/api/apex` - Execute Apex code
- `/api/metadata/deploy` - Deploy metadata
- `/api/metadata/retrieve` - Retrieve metadata
- `/api/orgs` - List available orgs
- `/api/soql/batch` - Execute multiple SOQL queries

## Deployment Methods

### Method 1: CLI Deployment (Recommended)

1. **Install dependencies and build:**
   ```bash
   cd packages/mcp
   npm install
   npm run build
   ```

2. **Login to Smithery:**
   ```bash
   smithery login
   ```

3. **Deploy:**
   ```bash
   smithery deploy .
   ```

### Method 2: GitHub Integration

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add Smithery deployment configuration"
   git push origin main
   ```

2. **Connect GitHub to Smithery:**
   - Go to https://smithery.ai/servers
   - Connect your GitHub repository
   - Navigate to the Deployments tab
   - Click "Deploy"

### Method 3: Using the Deployment Script

We've provided a convenient deployment script:

```bash
cd packages/mcp
chmod +x deploy-smithery.sh
./deploy-smithery.sh
```

The script will:
- Check prerequisites
- Install dependencies
- Build the project
- Deploy to smithery.ai

## Environment Variables

Configure these environment variables for your deployment:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SALESFORCE_ORG_USERNAME` | Salesforce org username/alias | Yes | - |
| `SALESFORCE_INSTANCE_URL` | Salesforce instance URL | Yes | - |
| `SALESFORCE_TOOLSETS` | Comma-separated toolsets | No | `all` |
| `SALESFORCE_ALLOW_ALL_ORGS` | Allow access to all orgs | No | `false` |
| `SALESFORCE_DEBUG` | Enable debug logging | No | `false` |

## Local Testing

### Using Docker Compose

1. **Set environment variables:**
   ```bash
   export SALESFORCE_ORG_USERNAME="your-org@example.com"
   export SALESFORCE_INSTANCE_URL="https://your-instance.salesforce.com"
   ```

2. **Build and run:**
   ```bash
   docker-compose up --build
   ```

3. **Test the endpoints:**
   ```bash
   # Health check
   curl http://localhost:3000/health

   # Execute SOQL
   curl -X POST http://localhost:3000/api/soql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "SELECT Id, Name FROM Account LIMIT 10",
       "orgUsername": "your-org@example.com"
     }'
   ```

### Using Node.js directly

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Start with REST API:**
   ```bash
   node bin/run.js \
     --rest-api \
     --api-port 3000 \
     --orgs your-org@example.com \
     --toolsets all
   ```

## REST API Usage Examples

### Execute SOQL Query

```bash
curl -X POST https://your-server.smithery.ai/api/soql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT Id, Name, Industry FROM Account WHERE Industry != null LIMIT 5",
    "orgUsername": "production-org@company.com"
  }'
```

### Execute Apex Code

```bash
curl -X POST https://your-server.smithery.ai/api/apex \
  -H "Content-Type: application/json" \
  -d '{
    "code": "System.debug('\''Hello from Apex'\''); return Database.query('\''SELECT COUNT() FROM Account'\'');",
    "orgUsername": "sandbox-org@company.com"
  }'
```

### Batch SOQL Queries

```bash
curl -X POST https://your-server.smithery.ai/api/soql/batch \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      "SELECT COUNT() FROM Account",
      "SELECT COUNT() FROM Contact",
      "SELECT COUNT() FROM Opportunity"
    ],
    "orgUsername": "analytics-org@company.com"
  }'
```

### List Available Orgs

```bash
curl https://your-server.smithery.ai/api/orgs
```

## Integration with AI Agents

Once deployed to smithery.ai, your server can be used by AI agents through:

1. **Direct MCP Connection**: AI clients can connect directly to your MCP server
2. **REST API**: HTTP-based access for any system that can make REST calls
3. **Smithery Registry**: Your server will be discoverable in the Smithery registry

### Example: Using with Claude

```javascript
// Configure Claude to use your deployed MCP server
const config = {
  mcp_servers: {
    salesforce: {
      url: "https://your-server.smithery.ai",
      api_key: "your-api-key",
      capabilities: ["soql", "apex", "metadata"]
    }
  }
};
```

## Security Considerations

1. **Authentication**: Ensure proper Salesforce authentication is configured
2. **API Keys**: Use smithery.ai's API key management for secure access
3. **Org Access**: Limit org access using the `--orgs` flag
4. **HTTPS**: All communication with smithery.ai uses HTTPS
5. **Environment Variables**: Never commit sensitive credentials to version control

## Troubleshooting

### Common Issues

1. **Build Errors**
   - Ensure Node.js v18+ is installed
   - Run `npm install` in the root directory first
   - Clear node_modules and reinstall if needed

2. **Authentication Errors**
   - Verify Salesforce CLI is authenticated: `sf org list`
   - Check environment variables are set correctly
   - Ensure the org username is correct

3. **Deployment Failures**
   - Check smithery.yaml syntax
   - Verify all required files are present
   - Review smithery CLI output for specific errors

4. **REST API Not Working**
   - Ensure `--rest-api` flag is used when starting
   - Check the port is not already in use
   - Verify CORS settings if accessing from browser

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export SALESFORCE_DEBUG=true
node bin/run.js --debug --rest-api
```

## Support

- **Smithery Documentation**: https://smithery.ai/docs
- **Salesforce MCP Issues**: https://github.com/salesforcecli/mcp/issues
- **Smithery Support**: support@smithery.ai

## Next Steps

1. Deploy your server using one of the methods above
2. Test the REST API endpoints with sample queries
3. Configure your AI agents to use the deployed server
4. Monitor logs and performance through smithery.ai dashboard