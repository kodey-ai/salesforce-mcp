# 🎯 THE REAL FIX - Smithery Deployment

## The Problem
Smithery `build` command is for NEW servers that need bundling. Your Salesforce MCP is **ALREADY** a complete, published NPM package!

## The Solution (3 Simple Steps)

### 1. Check if Already Published
```bash
npm view @salesforce/mcp
```

If it shows package info, it's already on NPM! Skip to step 3.

### 2. If NOT Published Yet
```bash
cd packages/mcp
npm login
npm publish --access public
```

### 3. Register on Smithery (The Only Step You Need!)

Go to: **https://smithery.ai/new**

Click **"Publish via URL"**

Enter: `https://www.npmjs.com/package/@salesforce/mcp`

## That's it! ✅

## How Users Install It

After registration, users can:

```bash
# Install via Smithery
smithery install @salesforce/mcp

# Or direct via NPX
npx @salesforce/mcp --orgs MY_ORG --toolsets core,dx
```

## Why This Works

- Smithery is a **registry/index**, not a build system
- Your server is already a CLI tool with `bin` entry in package.json
- Smithery just needs to know where to find your NPM package
- No building, no bundling, no complex configuration needed!

## For Claude Desktop / VS Code

Users configure it like this:

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "@salesforce/mcp@latest",
        "--orgs", "MY_ORG",
        "--toolsets", "core,dx"
      ]
    }
  }
}
```

## Summary

❌ Don't use `smithery build` - it's for new servers that need bundling
❌ Don't create complex wrappers
✅ Just register your existing NPM package URL on smithery.ai