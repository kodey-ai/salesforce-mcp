# Using Smithery with Salesforce MCP Server

## Available Smithery Commands

### 1. Development Mode (with hot-reload and tunnel)
```bash
smithery dev packages/mcp/bin/run.js
```
This starts a development server with hot-reload and creates a public tunnel for testing.

### 2. Build for Production
```bash
smithery build packages/mcp/bin/run.js
```
This builds your MCP server into a production-ready bundle in `.smithery/index.cjs`

### 3. Run Locally
```bash
smithery run @salesforce/mcp -- --orgs YOUR_ORG_ALIAS --toolsets core,dx
```

### 4. Test in Playground
```bash
smithery playground
```
Opens the MCP playground in your browser for testing.

## Publishing to Smithery Registry

To publish your server to the Smithery registry for others to use:

1. **Create an account** at [smithery.ai](https://smithery.ai)

2. **Login via CLI**:
```bash
smithery login
```

3. **Publish your server** (from GitHub):
   - Push your code to a GitHub repository
   - Add a `smithery.json` or `smithery.config.js` file
   - Register your repository on smithery.ai website

## Using Your Published Server

Once published, others can install and use your server:

```bash
# Install from Smithery registry
smithery install @salesforce/mcp

# Run the installed server
smithery run @salesforce/mcp -- --orgs MY_ORG --toolsets core,dx
```

## Local Testing

For local testing with the Salesforce MCP server:

```bash
# First build the project
npm install
npm run build

# Then run with Smithery
smithery run packages/mcp/bin/run.js -- --orgs YOUR_ORG --toolsets core,dx
```

## Available Toolsets

When configuring `--toolsets`, you can use:
- `core` - Core Salesforce operations
- `dx` - Salesforce DX tools
- `agent` - Agent-related tools
- `lwc` - Lightning Web Components tools
- `aura` - Aura components tools
- `mobile` - Mobile development tools
- `devops` - DevOps tools
- `all` - Enable all toolsets

For Salesforce-only tools, use: `--toolsets core,dx`