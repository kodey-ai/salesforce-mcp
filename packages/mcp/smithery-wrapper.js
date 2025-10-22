#!/usr/bin/env node

// Smithery-compatible wrapper for Salesforce MCP Server
// This wrapper spawns the actual CLI tool as a subprocess

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get arguments from command line
const args = process.argv.slice(2);

// Path to the actual CLI binary
const binPath = join(__dirname, 'bin', 'run.js');

// Spawn the actual MCP server
const child = spawn('node', [binPath, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Handle process termination
child.on('error', (err) => {
  console.error('Failed to start Salesforce MCP server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

// Forward signals to child process
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => {
    child.kill(signal);
  });
});