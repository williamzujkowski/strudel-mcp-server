# CLAUDE.md - Strudel MCP Server Development Guide

## Project Overview

This is an MCP (Model Context Protocol) server that provides Claude with direct control over Strudel.cc for AI-assisted music generation.

## Key Components

1. **MCP Server** (`src/index.ts`) - Handles MCP protocol and tool registration
2. **Strudel Controller** (`src/StrudelController.ts`) - Browser automation via Playwright
3. **Audio Analyzer** (`src/AudioAnalyzer.ts`) - Real-time audio analysis
4. **Pattern Store** (`src/PatternStore.ts`) - Local pattern storage with tagging

## Development Guidelines

- Use TypeScript with strict mode enabled
- Follow existing code patterns for consistency
- Ensure all browser automation is properly error-handled
- Test changes with actual Strudel.cc interaction

## Testing

```bash
# Build the project
npm run build

# Test MCP functionality
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js

# Run in development mode
npm run dev
```

## Adding New Tools

To add a new tool:
1. Add tool definition in `setupHandlers()` method
2. Implement handler in the switch statement
3. Add any necessary methods to StrudelController
4. Update README documentation

## Common Issues

- **Browser not opening**: Ensure Playwright Chromium is installed
- **Audio analysis failing**: Check that audio is actually playing
- **Pattern save errors**: Verify patterns directory exists

## Code Quality

- Keep functions focused and single-purpose
- Add type annotations for all parameters and returns
- Handle errors gracefully with meaningful messages
- Avoid unnecessary complexity