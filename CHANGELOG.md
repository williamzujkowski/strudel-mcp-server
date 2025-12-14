# Changelog

All notable changes to the Strudel MCP Server will be documented in this file.

## [2.3.0] - 2025-12-14

### New Features

#### Pattern History (#41)
- `list_history` - Browse pattern history with timestamps and previews
- `restore_history` - Restore previous patterns by ID
- `compare_patterns` - Line-by-line diff comparison between patterns

#### UX Improvements (#43)
- `compose` - One-shot pattern generation with auto-play
- `status` - Quick browser/playback state check
- `diagnostics` - Detailed system diagnostics
- `show_browser` - Bring browser window to foreground
- `screenshot` - Capture browser state
- `show_errors` - Display captured console errors

#### OIDC Publishing (#49)
- Updated npm publishing to use OIDC trusted publishing
- Added provenance attestation for supply chain security
- Created NPM_PUBLISHING.md documentation

### Improvements
- Docker optimization with .dockerignore and dependency pruning (#19)
- Pattern write verification to prevent cache sync issues (#47)
- Audio analyzer diagnostic hints for better debugging (#45)
- Pattern validation now triggers evaluation for error detection (#46)

### Documentation
- Updated README with accurate tool counts (52 tools)
- Fixed test counts (712 passing, 69% coverage)
- Added missing tool sections (Audio Analysis, UX, Performance)
- Removed inaccurate claims from previous changelog entries

## [2.2.0] - 2025-12-12

### Added
- Browser integration tests with live Strudel.cc website
- Pattern validation and auto-fix functionality
- Performance monitoring utilities
- Error recovery with retry logic

### Technical
- EnhancedMCPServerFixed with improved browser state handling
- Pattern caching for generated patterns
- TypeScript strict mode compliance

## [2.1.0] - 2025-11-15

### Added
- Integration test framework
- Music theory engine (scales, chords, progressions)
- Pattern generator for multiple genres

## [2.0.0] - 2025-11-01

### Added
- 40+ MCP tools for music control
- Euclidean rhythm generation
- Audio analysis via Web Audio API

### Breaking Changes
- Restructured server architecture

## [1.0.0] - 2025-08-18

### Initial Release
- Basic MCP server implementation
- Core Strudel control tools (init, write, play, stop)
- Browser automation with Playwright
- Pattern storage system
