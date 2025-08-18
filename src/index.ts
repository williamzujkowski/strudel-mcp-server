#!/usr/bin/env node
import { EnhancedMCPServerFixed } from './server/EnhancedMCPServerFixed.js';

const server = new EnhancedMCPServerFixed();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});