#!/bin/bash

echo "🧪 Testing Salesforce MCP Server Locally"
echo "========================================="

# Check if a Salesforce org is provided as argument
if [ -z "$1" ]; then
    echo "⚠️  No org specified. Using DEFAULT_TARGET_ORG"
    ORG="DEFAULT_TARGET_ORG"
else
    ORG="$1"
fi

echo ""
echo "📦 Building the MCP package..."
cd packages/mcp

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the project
npm run build

echo ""
echo "🚀 Starting MCP Server with:"
echo "   Org: $ORG"
echo "   Toolsets: core,dx (Salesforce tools only)"
echo ""

# Run the server directly
node bin/run.js --orgs "$ORG" --toolsets core,dx

echo ""
echo "✅ Test complete!"