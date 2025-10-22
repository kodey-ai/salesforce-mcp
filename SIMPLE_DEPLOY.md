# 🚀 Simple Smithery Deployment (No Build Required)

Your Salesforce MCP server is **already a complete CLI tool**. You don't need Smithery's build command!

## Quick Deploy in 3 Steps:

### 1️⃣ Fix NPM Cache (one-time)
```bash
# Fix npm cache permissions
rm -rf ~/.npm/_cacache
mkdir -p ~/.npm
```

### 2️⃣ Publish to NPM
```bash
cd packages/mcp

# Login to NPM (if not already)
npm login

# Publish your package
npm publish --access public
```

### 3️⃣ Register on Smithery Website
Go to: https://smithery.ai/new

Choose one option:
- **Option A**: Click "Continue with GitHub" → Connect your repo
- **Option B**: Click "Publish via URL" → Enter: `https://www.npmjs.com/package/@salesforce/mcp`

## ✅ That's it!

## How Users Will Use Your Server:

### Via Smithery:
```bash
smithery install @salesforce/mcp
smithery run @salesforce/mcp -- --orgs MY_ORG --toolsets core,dx
```

### Via NPX (Direct):
```bash
npx @salesforce/mcp --orgs MY_ORG --toolsets core,dx
```

### In Claude Desktop:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp", "--orgs", "MY_ORG", "--toolsets", "core,dx"]
    }
  }
}
```

## 📝 Note:
- Smithery is just a **registry/index** - not a hosting platform
- Your server runs on users' local machines
- No complex build process needed for CLI tools like yours!