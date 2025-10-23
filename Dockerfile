FROM node:22-slim

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies based on lockfile
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy the rest of the application
COPY . .

# The PORT environment variable will be set by smithery (defaults to 8081)
# Our index.mjs already handles HTTP mode when PORT is set

# Run the server directly
CMD ["node", "index.mjs"]
