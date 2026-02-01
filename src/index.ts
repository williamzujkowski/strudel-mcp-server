#!/usr/bin/env node

// Suppress stdout during @strudel imports - they print emoji messages that break MCP JSON-RPC protocol
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalConsoleLog = console.log.bind(console);

(process.stdout as any).write = (chunk: any, ...args: any[]) => {
  return (process.stderr as any).write(chunk, ...args);
};
console.log = (...args: any[]) => {
  console.error(...args);
};

// Use dynamic import so suppression takes effect before @strudel loads
const { EnhancedMCPServerFixed } = await import('./server/EnhancedMCPServerFixed.js');

// Restore stdout after imports complete
process.stdout.write = originalStdoutWrite;
console.log = originalConsoleLog;

const server = new EnhancedMCPServerFixed();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});