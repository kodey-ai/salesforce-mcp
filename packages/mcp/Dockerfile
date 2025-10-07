# Multi-stage build for Salesforce MCP Server
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files from root and mcp package
COPY package.json yarn.lock ./
COPY packages/mcp/package.json ./packages/mcp/

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY packages/mcp ./packages/mcp/

# Build the TypeScript project
WORKDIR /app/packages/mcp
RUN yarn build

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/packages/mcp/package.json ./packages/mcp/

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built application
COPY --from=builder /app/packages/mcp/lib ./packages/mcp/lib
COPY --from=builder /app/packages/mcp/bin ./packages/mcp/bin
COPY --from=builder /app/packages/mcp/messages ./packages/mcp/messages
COPY --from=builder /app/packages/mcp/smithery.yaml ./packages/mcp/

# Set ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    SF_LOG_COLORIZE=false \
    SF_LOG_STDERR=true

# Expose REST API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Set the working directory to the mcp package
WORKDIR /app/packages/mcp

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the MCP server with REST API enabled
CMD ["node", "bin/run.js", "--rest-api", "--api-port", "3000", "--orgs", "ALLOW_ALL_ORGS", "--toolsets", "all"]