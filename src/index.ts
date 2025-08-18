#!/usr/bin/env node
import { EnhancedMCPServer } from './server/EnhancedMCPServer.js';

const server = new EnhancedMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});