#!/bin/bash

# Quick Deploy Script for Salesforce MCP to Smithery

echo "🚀 Salesforce MCP Quick Deploy to Smithery"
echo "==========================================="
echo ""

# Step 1: Login to Smithery
echo "Step 1: Logging in to Smithery..."
echo "📝 Get your API key from: https://smithery.ai/account"
smithery login

# Step 2: Build the project
echo ""
echo "Step 2: Building the project..."
cd packages/mcp
npm install
npm run build

# Step 3: Test locally
echo ""
echo "Step 3: Testing locally with Smithery playground..."
echo "Press Ctrl+C to continue after testing"
smithery playground-stdio node bin/run.js -- --orgs DEFAULT_TARGET_ORG --toolsets core,dx

# Step 4: Publish to NPM
echo ""
echo "Step 4: Publishing to NPM..."
echo "Make sure you're logged in to NPM (npm login)"
read -p "Are you logged in to NPM? (y/n): " npm_logged_in

if [ "$npm_logged_in" = "y" ]; then
    npm publish --access public
    echo "✅ Published to NPM successfully!"
else
    echo "Please run: npm login"
    echo "Then run: npm publish --access public"
fi

# Step 5: Register on Smithery
echo ""
echo "Step 5: Register on Smithery"
echo "=========================================="
echo "Go to: https://smithery.ai/new"
echo ""
echo "Choose one of these options:"
echo "  1. Click 'Continue with GitHub' and connect your repo"
echo "  2. Click 'Publish via URL' and enter: https://www.npmjs.com/package/@salesforce/mcp"
echo ""
echo "✅ Deployment process complete!"