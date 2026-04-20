# Changelog

All notable changes to this MCP server will be documented in this file.

## [1.0.0] — rename

**Project renamed:** `@williamzujkowski/strudel-mcp-server` → `@williamzujkowski/live-coding-music-mcp`.

The old package name borrowed the upstream project's brand ("strudel"). The upstream maintainer asked that third-party adapters not include "strudel" in their package name (see issue #97) so it's clear which project is the canonical one. Renamed to `live-coding-music-mcp` — descriptive of what the tool does without claiming a brand.

The README, keywords, and description still reference `strudel.cc` accurately — this adapter drives the Strudel REPL. Only the package / repo name changed.

### Breaking changes

- npm package `@williamzujkowski/strudel-mcp-server` is **deprecated**. Install `@williamzujkowski/live-coding-music-mcp` instead.
- GitHub repo renamed from `strudel-mcp-server` to `live-coding-music-mcp`. Old URLs redirect automatically.
- `bin` name changed from `strudel-mcp` to `live-coding-music-mcp`. Update your MCP client config.
- Internal MCP server identifier changed from `strudel-mcp-enhanced` to `live-coding-music-mcp`.
- Docker image/container names changed to match. Rebuild images.
- Version bumped to `1.0.0` to mark the rename as a clean break.

### Migration

```bash
# Uninstall old
npm uninstall -g @williamzujkowski/strudel-mcp-server

# Install new
npm install -g @williamzujkowski/live-coding-music-mcp

# Update MCP client config
# OLD:  "command": "strudel-mcp"
# NEW:  "command": "live-coding-music-mcp"
```

## [Unreleased — pre-rename, now 2.4.1 on old package name]

> 66 tools registered
> Since v2.4.1

### New Features

- add suggest_pattern_from_audio tool — AI-powered audio-to-pattern (#95)

### Fixed

- **fix: play tool now actually starts audio (#119)** — `play` was only
  putting Strudel in "warm" state (code evaluated, audio not started)
  because `Ctrl+Enter` alone doesn't resume the AudioContext on first
  invocation. `play()` now clicks the play button directly to establish
  the user gesture; `stop()` does the same. Added
  `--autoplay-policy=no-user-gesture-required` Chromium flag as insurance.
- **fix: pin @strudel/\* to 1.2.5** — `@strudel/core@1.2.6` imports
  `SalatRepl` from `@kabelsalat/web`, which does not export that symbol.
  Every CI run since the dependabot bump failed at the `validate` step.
  Pinned `core`, `mini`, `tonal`, `transpiler` to `1.2.5` (last clean
  release). Revisit when upstream ships a working 1.2.7+.
- ESLint config, test file names, Node version docs, CI improvements

### Changed

- **docs: maturity statement bumped from "experimental" to "beta" (#111)**.
  77% statement coverage, 1470 passing tests, hardened CI, real audio
  output verified. Stable tool schemas within minor versions. Known
  coverage gaps (`AudioCaptureService` 33%, `AudioAnalyzer` branch 48%)
  tracked as open issues.

### Refactored

- rename server, strip emoji, make docs evergreen

### Maintenance

- cleanup vestigial content + auto-generate tool docs
- **deps**: update all dependencies to latest LTS
- **deps**: update lockfile to resolve 12 security vulnerabilities
- add SECURITY.md and Nerq Trust badge
- **deps**: Bump hono in the npm_and_yarn group across 1 directory (#90)
- **deps**: Bump qs in the npm_and_yarn group across 1 directory (#89)
- **deps**: Bump @modelcontextprotocol/sdk (#86)

## [2.4.1] - 2026-02-01

### Fixed

- **MCP Protocol**: Fixed stdout pollution from @strudel imports breaking JSON-RPC communication (#85)
- **Chord Generation**: Fixed `generateChordProgression()` to produce valid Strudel syntax - `note("<C G Am F>")` instead of invalid `note("C" "G" "Am" "F")` (#85)
- **Documentation**: Corrected tool count from 66 to 65, updated test statistics

### Security

- Bump hono 4.11.4 → 4.11.7 (CVE fixes) (#84)

### Contributors

- @linxule - MCP compatibility and chord syntax fixes

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
