# Changelog

All notable changes to the Strudel MCP Server will be documented in this file.

## [2.4.0] - 2026-01-25

### New Features

#### Multi-Session Browser Support (#75)
- `SessionManager` for concurrent Strudel sessions with browser context isolation
- Max 5 concurrent sessions with 30-minute auto-cleanup timeout
- New MCP tools: `create_session`, `destroy_session`, `list_sessions`, `switch_session`
- Optional `session_id` parameter on existing tools for session targeting

#### MIDI Export (#74)
- `MIDIExportService` for exporting Strudel patterns to standard MIDI files
- `export_midi` tool with note name to MIDI number conversion
- Chord expansion support (major, minor, 7th, maj7, m7, dim, aug, etc.)

#### Audio Capture (#71, #72)
- `AudioCaptureService` with MediaRecorder integration
- New MCP tools: `start_audio_capture`, `stop_audio_capture`, `capture_audio_sample`

#### AI-Powered Pattern Feedback (#67, #73, #76)
- `GeminiService` for AI-powered music analysis via Google Gemini
- `get_pattern_feedback` MCP tool with Gemini integration
- `get_feedback` option added to compose workflow
- Application Default Credentials (ADC) support for Google Cloud auth
- Gemini CLI credential auto-detection from config files

#### Creative Tools
- `refine` - Iteratively improve patterns with specific instructions
- `set_energy` - Adjust pattern energy level (0-100)
- `jam_with` - Collaborate with AI to evolve patterns
- `shift_mood` - Transform pattern emotional character

#### New Music Genres (#52)
- `intelligent_dnb` - Intelligent drum and bass patterns
- `trip_hop` - Trip hop style patterns (Portishead, Massive Attack style)
- `boom_bap` - Classic boom bap hip hop patterns (DJ Premier style)

### Fixed
- Gemini CLI credential paths now check correct locations
- PerformanceMonitor falsy check bugs
- CodeMirror timing race condition (#54)
- StrudelController now uses `window.strudelMirror` API (strudel.cc compatibility fix)

### Security
- Removed `executeInStrudelContext()` - eliminated Function constructor injection vulnerability (#56)

### Documentation
- Updated all tool counts from 52 to 66
- Updated test counts from 704 to 1521
- Updated coverage from 69% to 78%
- Fixed file structure documentation to match actual codebase
- Updated CodeMirror API references to use strudelMirror

### Tests
- StrudelController coverage improved to 81.67% (#70)
- Comprehensive PatternValidator tests (#69)
- AudioAnalyzer algorithm validation tests
- ErrorRecovery comprehensive test suite
- Gemini integration and E2E tests
- 46 new tests for session management

### Dependencies
- Bumped `hono` (security update) (#55)
- Bumped `@modelcontextprotocol/sdk` (#53)
- Bumped `qs` (security update) (#51)
- Added `@tonejs/midi` for MIDI export
- Added `google-auth-library` for ADC support

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

### Security
- **CRITICAL**: Removed `executeInStrudelContext()` method (#56)
  - Used `new Function()` constructor which is equivalent to `eval()`
  - Method was not used in production code, only in tests
  - Pattern execution now uses safe `writePattern()` + `play()` path

### Documentation
- Updated README with accurate tool counts
- Fixed test counts and coverage documentation
- Added Prerequisites section with requirements table
- Added Quick Reference section for common commands
- Added Security section documenting validation and sandboxing
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
