#!/bin/bash

# Deploy Salesforce MCP Server to Smithery

echo "🚀 Deploying Salesforce MCP Server to Smithery..."

# Check if smithery.json exists
if [ ! -f "smithery.json" ]; then
    echo "❌ Error: smithery.json not found!"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed!"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed!"
    exit 1
fi

echo "✅ Project built successfully!"

# Check if Smithery CLI is installed
if ! command -v smithery &> /dev/null; then
    echo "📥 Installing Smithery CLI..."
    npm install -g @smithery/cli
fi

# Deploy to Smithery
echo "☁️  Deploying to Smithery..."
echo ""
echo "Next steps:"
echo "1. Run: smithery login"
echo "2. Run: smithery deploy"
echo ""
echo "Or visit https://smithery.ai to deploy via GitHub integration"
echo ""
echo "📖 See SMITHERY_DEPLOYMENT.md for detailed instructions"