#!/bin/bash

# Smithery.ai Deployment Script for Salesforce MCP Server
# This script handles the deployment of the Salesforce MCP server to smithery.ai

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Salesforce MCP Server - Smithery Deployment   ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print error and exit
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Function to print warning
warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check for Node.js
if ! command_exists node; then
    error_exit "Node.js is not installed. Please install Node.js v18 or later."
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error_exit "Node.js version 18 or later is required. Current version: $(node -v)"
fi
success "Node.js $(node -v) detected"

# Check for npm
if ! command_exists npm; then
    error_exit "npm is not installed."
fi
success "npm $(npm -v) detected"

# Check for Smithery CLI
if ! command_exists smithery; then
    warning "Smithery CLI is not installed. Installing..."
    npm install -g @smithery/cli || error_exit "Failed to install Smithery CLI"
    success "Smithery CLI installed successfully"
else
    success "Smithery CLI detected"
fi

# Check for required environment variables
echo -e "\n${YELLOW}Checking environment configuration...${NC}"

if [ -z "$SALESFORCE_ORG_USERNAME" ]; then
    warning "SALESFORCE_ORG_USERNAME is not set"
    read -p "Enter your Salesforce org username: " SALESFORCE_ORG_USERNAME
    export SALESFORCE_ORG_USERNAME
fi

if [ -z "$SALESFORCE_INSTANCE_URL" ]; then
    warning "SALESFORCE_INSTANCE_URL is not set"
    read -p "Enter your Salesforce instance URL: " SALESFORCE_INSTANCE_URL
    export SALESFORCE_INSTANCE_URL
fi

# Navigate to the MCP package directory
cd "$(dirname "$0")"
info "Working directory: $(pwd)"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install || error_exit "Failed to install dependencies"
success "Dependencies installed"

# Build the project
echo -e "\n${YELLOW}Building the project...${NC}"
npm run build || error_exit "Failed to build the project"
success "Project built successfully"

# Login to Smithery (if not already logged in)
echo -e "\n${YELLOW}Authenticating with Smithery...${NC}"
if ! smithery whoami >/dev/null 2>&1; then
    info "Please login to Smithery"
    smithery login || error_exit "Failed to login to Smithery"
fi
success "Authenticated with Smithery"

# Deploy to Smithery
echo -e "\n${YELLOW}Deploying to Smithery...${NC}"

# Option 1: Deploy using Smithery CLI
deploy_with_cli() {
    info "Deploying using Smithery CLI..."
    smithery deploy . || error_exit "Deployment failed"
}

# Option 2: Deploy using Git integration
deploy_with_git() {
    info "Setting up Git deployment..."

    # Check if this is a git repository
    if [ ! -d ".git" ]; then
        warning "Not a git repository. Initializing..."
        git init
        git add .
        git commit -m "Initial commit for Smithery deployment"
    fi

    # Push to GitHub (assuming remote is configured)
    info "Pushing to GitHub..."
    git push origin main || warning "Could not push to GitHub. Please ensure your repository is connected to Smithery."

    info "Please complete deployment at https://smithery.ai/servers"
    info "1. Navigate to your server page on Smithery"
    info "2. Click on the 'Deployments' tab"
    info "3. Click 'Deploy' to build and host your server"
}

# Ask user for deployment method
echo -e "\n${YELLOW}Select deployment method:${NC}"
echo "1) Deploy using Smithery CLI (recommended)"
echo "2) Deploy using GitHub integration"
read -p "Enter choice [1-2]: " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
    1)
        deploy_with_cli
        ;;
    2)
        deploy_with_git
        ;;
    *)
        error_exit "Invalid choice"
        ;;
esac

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}   Deployment Process Complete!                  ${NC}"
echo -e "${GREEN}==================================================${NC}"

# Print connection information
echo -e "\n${YELLOW}Connection Information:${NC}"
echo -e "Server Name: salesforce-mcp-server"
echo -e "Version: 0.21.2"

echo -e "\n${YELLOW}REST API Endpoints (when deployed):${NC}"
echo -e "Health Check: ${BLUE}https://your-server.smithery.ai/health${NC}"
echo -e "SOQL Query:   ${BLUE}POST https://your-server.smithery.ai/api/soql${NC}"
echo -e "Apex Code:    ${BLUE}POST https://your-server.smithery.ai/api/apex${NC}"
echo -e "List Orgs:    ${BLUE}GET https://your-server.smithery.ai/api/orgs${NC}"

echo -e "\n${YELLOW}Example SOQL Request:${NC}"
cat << 'EOF'
curl -X POST https://your-server.smithery.ai/api/soql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT Id, Name FROM Account LIMIT 10",
    "orgUsername": "your-org@example.com"
  }'
EOF

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Verify deployment at https://smithery.ai/servers"
echo "2. Test REST API endpoints using the provided examples"
echo "3. Configure your LLM clients to use the deployed server"

echo -e "\n${GREEN}Done! Your Salesforce MCP server is ready for deployment.${NC}"