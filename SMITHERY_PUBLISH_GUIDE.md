# Publishing Salesforce MCP to Smithery Registry

## Overview
Smithery is a registry/index for MCP servers - not a hosting platform. Your server runs locally on users' machines after they install it.

## Step 1: Prepare for NPM Publishing

### Update package.json for publishing
Your package needs to be published to NPM first. In `packages/mcp/package.json`, ensure:
```json
{
  "name": "@salesforce/mcp",
  "publishConfig": {
    "access": "public"
  }
}
```

### Build the project
```bash
cd packages/mcp
npm install
npm run build
```

### Publish to NPM
```bash
npm login
npm publish --access public
```

## Step 2: Register on Smithery

1. Visit https://smithery.ai/new
2. Click "Continue with GitHub"
3. Connect your GitHub repository: https://github.com/salesforcecli/mcp
4. Smithery will detect your MCP server configuration

## Step 3: Configuration for Users

Once registered, users can install your server:

### Via Smithery CLI:
```bash
# Install from Smithery
smithery install @salesforce/mcp

# Run with Salesforce tools
smithery run @salesforce/mcp -- --orgs MY_ORG --toolsets core,dx
```

### Via NPM directly:
```bash
# Install globally
npm install -g @salesforce/mcp

# Run the server
sf-mcp-server --orgs MY_ORG --toolsets core,dx
```

### In Claude Desktop or VS Code:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp",
        "--orgs", "MY_ORG_ALIAS",
        "--toolsets", "core,dx"
      ]
    }
  }
}
```

## Configuration Parameters

When users run your server, they configure:

- `--orgs`: Authorized Salesforce org aliases (required)
  - Example: `--orgs dev-sandbox,production`

- `--toolsets`: Tool categories to enable (optional)
  - Options: `core`, `dx`, `agent`, `lwc`, `aura`, `mobile`, `devops`, `all`
  - Default: `core,dx` (Salesforce tools only)

## Testing Locally Before Publishing

### Test with Smithery playground:
```bash
cd packages/mcp
smithery playground-stdio node bin/run.js -- --orgs DEFAULT_TARGET_ORG --toolsets core,dx
```

### Test installation flow:
```bash
# Build locally
npm run build

# Test as if installed
npx . --orgs YOUR_ORG --toolsets core,dx
```

## Security Notes

- Users must have Salesforce orgs pre-authorized locally
- Server accesses encrypted auth files on user's machine
- No credentials are exposed through the MCP protocol
- Org access is restricted to allowlisted orgs only

## Support Resources

- Smithery Registry: https://smithery.ai
- GitHub Repository: https://github.com/salesforcecli/mcp
- NPM Package: https://www.npmjs.com/package/@salesforce/mcp