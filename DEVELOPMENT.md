# Development Guide

## Prerequisites

- Node.js 22+ (LTS)
- npm 10+

## Quick Start

```bash
npm install
npm run build
npm test
```

## Testing

```bash
npm test                    # Run all tests with coverage
npm run test:nocov          # Run tests without coverage
npm run test:watch          # Watch mode
npm run test:browser        # Browser integration tests (requires Chromium)
```

## Validating the MCP Server

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

## Adding to Claude

```bash
claude mcp add strudel node $(pwd)/dist/index.js
```

## Docker

```bash
npm run docker:build        # Build container
npm run docker:run          # Run via docker-compose
```

## Publishing

See [NPM_PUBLISHING.md](NPM_PUBLISHING.md) for npm publishing instructions.
