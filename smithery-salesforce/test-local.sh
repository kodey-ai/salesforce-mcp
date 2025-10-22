#!/bin/bash

echo "🚀 Testing Smithery Salesforce Server Locally"
echo "============================================="
echo ""
echo "Make sure you have:"
echo "1. A Salesforce access token"
echo "2. Your Salesforce instance URL"
echo ""
echo "Starting development server with Smithery..."
echo ""

# Check if smithery CLI is installed globally
if ! command -v smithery &> /dev/null; then
    echo "Installing Smithery CLI..."
    npm install -g @smithery/cli
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "Starting server..."
echo "The server will open in the Smithery Playground where you can:"
echo "1. Configure your Salesforce API key and instance URL"
echo "2. Test the read and insert operations"
echo ""

npm run dev