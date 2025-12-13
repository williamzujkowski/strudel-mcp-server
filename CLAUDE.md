# Strudel MCP Server - Development Guide for LLMs

## Tone and Style Guidelines

When writing documentation, code comments, commit messages, or any project communication, adopt a **polite but direct Linus Torvalds** tone:

### Core Principles
1. **Technical Accuracy Over Everything**
   - Never exaggerate capabilities or test coverage
   - Never claim "production-ready" unless it genuinely is
   - Be precise: "52% statement coverage" not "comprehensive testing"
   - If something is broken, say it's broken

2. **Direct Communication**
   - "This doesn't work" instead of "This might not work in some cases"
   - "Wrong approach" instead of "Perhaps we could consider alternatives"
   - "Fix this" instead of "It would be nice if we could improve this"
   - But always explain *why* something is wrong

3. **Respectful Directness**
   - Attack the code, never the coder
   - "This implementation is inefficient" ✅
   - "You don't know what you're doing" ❌
   - Explain the issue, suggest better solutions

4. **High Standards, Zero Tolerance for BS**
   - No marketing speak in technical docs
   - No unnecessary buzzwords
   - No claiming features that don't exist
   - If it's experimental, label it experimental
   - If it's a hack, call it a hack

5. **Clarity Beats Politeness**
   - Be blunt when needed for clarity
   - Don't soften technical criticism with fluffy language
   - "This won't scale" > "This might face some scalability challenges"
   - But provide context and alternatives

### Examples

**Good (Polite Linus):**
```
This browser automation approach is the wrong solution.
Direct CodeMirror API access is 80% faster and doesn't
break on keyboard layout differences. See lines 92-102
for the correct implementation.
```

**Bad (Too Soft):**
```
While the browser automation works, we might want to
consider perhaps exploring the possibility of using
direct API access, which could potentially improve
performance in some scenarios.
```

**Bad (Too Harsh):**
```
Whoever wrote this clearly has no idea about performance.
This is garbage code that should never have made it past
code review.
```

### Documentation Standards
- State what the code *actually* does, not what you wish it did
- Test coverage numbers must be accurate
- "Open source, actively developed" > "Production-ready enterprise solution"
- Mention known issues and limitations upfront
- Welcome contributions but don't claim the project is perfect

## Project Purpose
This is an **open source, actively developed** MCP server enabling AI agents to generate music via Strudel.cc using browser automation.

**Current State:** Functional but experimental. 52% test coverage. Known issues exist (see GitHub Issues). Contributions welcome.

## GitHub Issues Workflow

**Core Rule:** GitHub Issues are the single source of truth for all work tracking. Planning documents in the repository will be rejected.

### When to Create Issues

**REQUIRED (create issue first):**
- New features (>50 LOC)
- Architecture changes
- New dependencies
- Breaking changes
- Multi-file refactors
- Performance optimizations
- Security fixes

**OPTIONAL (direct commit OK):**
- Typo fixes (<10 LOC)
- Comment improvements
- Single-function bug fixes (<20 LOC)
- Test additions (no code changes)

### Issue Labels

**Category** (required): `bug`, `feature`, `enhancement`, `testing`, `docs`, `refactor`, `performance`, `security`
**Priority** (required): `critical`, `high`, `medium`, `low`

### Issue Template

Every issue must include:
- Clear description
- Component affected
- Acceptance criteria (checkboxes)
- Testing requirements
- Workflow monitoring step

### Pre-Commit Check

Before closing ANY issue:
```bash
# Check for planning docs
git status --short | grep -E "(TDD_|PLANNING_|FUTURE_|OPTIMIZATION_|.*_REPORT\.md)"
# If found → DELETE or convert to issues

# Create follow-on issues
gh issue create --title "Follow-up: ..." --label "enhancement,medium"

# Close with verification
gh issue close <number> --comment "✅ Tests pass, build succeeds, no planning docs"
```

### Forbidden Files

**NEVER commit:** `TDD_*.md`, `PLANNING_*.md`, `FUTURE_*.md`, `OPTIMIZATION_*.md`, `*_REPORT.md`, `*_GUIDE.md`, `*_PLAN.md`

Use GitHub Issues instead. Planning documents clutter the repo and become stale immediately.

### Commit Message Format

Reference issues in commits:
```bash
git commit -m "feat: Add tempo detection (#123)

Implements FFT-based BPM detection.
Closes #123"
```

## Core Architecture

```
MCP Protocol Layer (42 tools)
    ↓
Services: MusicTheory, PatternGenerator
    ↓
Controllers: StrudelController, AudioAnalyzer
    ↓
Storage: PatternStore
    ↓
Integration: Playwright → Strudel.cc
```

## Key Components

### 1. EnhancedMCPServerFixed (`src/server/EnhancedMCPServerFixed.ts`)
- **Purpose**: MCP protocol handling, tool registration
- **Tools**: 42 registered tools for pattern generation, manipulation, analysis
- **Key Methods**: `setupHandlers()`, `executeTool()`, `handleToolsList()`
- **State**: Manages undo/redo stacks, pattern cache

### 2. StrudelController (`src/StrudelController.ts`)
- **Purpose**: Browser automation via Playwright
- **Key Methods**: `initialize()`, `writePattern()`, `play()`, `stop()`, `getCurrentPattern()`
- **Optimizations**: Editor caching (100ms TTL), resource blocking, direct CodeMirror API access
- **Location**: Lines 71-80 use CodeMirror internal API `.__view` for performance

### 3. AudioAnalyzer (`src/AudioAnalyzer.ts`)
- **Purpose**: Real-time FFT audio analysis
- **Key Methods**: `inject()`, `getAnalysis()`
- **Features**: Frequency bands, spectral centroid, brightness detection
- **Caching**: 50ms TTL, dual-layer (browser + server)

### 4. MusicTheory (`src/services/MusicTheory.ts`)
- **Purpose**: Music theory calculations
- **Features**: 15+ scales, 8+ chord progressions, Euclidean rhythms
- **Key Methods**: `generateScale()`, `generateChordProgression()`, `euclid()`

### 5. PatternGenerator (`src/services/PatternGenerator.ts`)
- **Purpose**: Genre-based pattern generation
- **Styles**: techno, house, dnb, ambient, trap, jungle, jazz, experimental
- **Key Methods**: `generateCompletePattern()`, `generateDrums()`, `generateBassline()`

### 6. PatternStore (`src/PatternStore.ts`)
- **Purpose**: JSON-based pattern persistence
- **Security**: Path traversal protection in `sanitizeFilename()`
- **Caching**: Map-based pattern cache, list cache (5s TTL)

### 7. Utility Classes (`src/utils/`)
- **PatternValidator**: Syntax validation, auto-fix, safety checks
- **ErrorRecovery**: Retry logic with exponential backoff
- **PerformanceMonitor**: Operation timing, bottleneck detection
- **Logger**: Structured logging

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Page Load | 1.5-2s | With resource blocking |
| Pattern Write | 50-80ms | Cached editor access |
| Pattern Read (cached) | 10-15ms | 100ms TTL |
| Play/Stop | 100-150ms | Keyboard shortcuts |
| Audio Analysis | 10-15ms | FFT with typed arrays |

## Development Workflow

### Building
```bash
npm run build          # TypeScript compilation
npm run validate       # Test MCP protocol
```

### Testing
```bash
npm test              # Run Jest tests (146 tests)
npm run test:watch    # Watch mode
```

### Adding New Tools
1. Define tool in `EnhancedMCPServerFixed.setupHandlers()`:
   ```typescript
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     const { name, arguments: args } = request.params;
     // Add to switch statement in executeTool()
   });
   ```

2. Implement handler in `executeTool()` switch:
   ```typescript
   case 'your_tool':
     const result = await this.yourMethod(args);
     return JSON.stringify({ result });
   ```

3. Add service method if needed (MusicTheory, PatternGenerator, etc.)

4. Update README.md tool reference

### Code Standards
- TypeScript strict mode required
- JSDoc for all public methods
- Error handling: try-catch with graceful degradation
- Async/await patterns (no callbacks)
- Security: Validate all user inputs

## Common Patterns

### Browser Automation
```typescript
// Direct CodeMirror manipulation (fast)
await this.page.evaluate((pattern) => {
  const editor = document.querySelector('.cm-content');
  const view = editor.__view;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: pattern }
  });
}, patternCode);
```

### Error Recovery
```typescript
import { ErrorRecovery } from './utils/ErrorRecovery';

const result = await ErrorRecovery.withRetry(
  async () => await riskyOperation(),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### Pattern Validation
```typescript
import { PatternValidator } from './utils/PatternValidator';

const validation = PatternValidator.validate(pattern, true); // auto-fix
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  const fixed = validation.fixed; // Auto-fixed version
}
```

## Known Issues & Limitations

### Current Limitations
- Single browser instance (no multi-session)
- Tempo/key detection stubbed (lines marked "Coming soon")
- Undo stack unbounded (memory growth risk)
- Integration test import issue (MCP SDK ES modules)

### Security Considerations
- Pattern validation prevents dangerous patterns (gain > 2.0, eval blocks)
- Path traversal protection in PatternStore
- Browser runs in sandbox
- No credential storage

## File Structure
```
src/
├── index.ts                    # Entry point
├── server/
│   └── EnhancedMCPServerFixed.ts  # MCP server (847 lines)
├── controllers/
│   └── StrudelController.ts    # Browser automation (100 lines)
├── analyzers/
│   └── AudioAnalyzer.ts        # Audio analysis (109 lines)
├── services/
│   ├── MusicTheory.ts          # Music theory (149 lines)
│   └── PatternGenerator.ts     # Pattern generation (192 lines)
├── storage/
│   └── PatternStore.ts         # Persistence (127 lines)
├── utils/
│   ├── Logger.ts               # Logging (23 lines)
│   ├── PatternValidator.ts     # Validation (317 lines)
│   ├── ErrorRecovery.ts        # Error handling (387 lines)
│   └── PerformanceMonitor.ts   # Monitoring (144 lines)
└── __tests__/                  # Jest tests (146 tests)
```

## Testing Strategy
- **Unit Tests**: MusicTheory, PatternGenerator (100% coverage)
- **Integration Tests**: StrudelController, PatternStore (77-85% coverage)
- **Mock Infrastructure**: MockPlaywright, TestFixtures
- **Coverage Target**: 80% overall, 100% for services

## Debugging Tips
```bash
# Verbose logging
DEBUG=* node dist/index.js

# Test specific tool
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generate_drums","arguments":{"style":"techno"}},"id":1}' | node dist/index.js

# Browser debugging (headful mode)
# Set headless: false in config

# Performance monitoring
# Use performance_report tool via MCP
```

## Critical Code Locations

### Security-Critical
- `PatternStore.sanitizeFilename()` - Path traversal protection
- `PatternValidator.validate()` - Dangerous pattern detection
- `StrudelController.writePattern()` - Input validation entry point

### Performance-Critical
- `StrudelController.getCurrentPattern()` - Editor caching
- `AudioAnalyzer.getAnalysis()` - FFT optimization
- `PatternStore.list()` - Parallel file reading

### Integration Points
- `StrudelController.initialize()` - Browser setup, resource blocking
- `AudioAnalyzer.inject()` - Web Audio API monkey-patching
- `EnhancedMCPServerFixed.executeTool()` - Tool routing

## When Making Changes

### Before Committing
1. Run `npm run build` - Verify TypeScript compilation
2. Run `npm test` - Ensure tests pass
3. Run `npm run validate` - Test MCP protocol
4. Update README.md if adding tools
5. Add JSDoc to new public methods

### Performance Guidelines
- Cache frequently accessed data (TTL 50-100ms for real-time, 5s for static)
- Use parallel operations (`Promise.all`) for I/O
- Prefer direct DOM manipulation over keyboard simulation
- Block unnecessary resources in Playwright

### Security Guidelines
- Validate all user inputs
- Sanitize filenames with `path.basename()`
- Limit numeric ranges (BPM: 20-300, gain: 0-2)
- No eval/Function constructors
- Check array bounds

## Common Troubleshooting

**Build fails**: `rm -rf dist && npm run build`
**Tests fail**: Check Node version (18+), run `npm install`
**Browser won't launch**: `npx playwright install chromium`
**Audio analysis stuck**: Verify audio is playing, check browser console
**Pattern validation errors**: Use auto-fix option, check syntax

## Architecture Decisions

**Why Playwright?** Strudel.cc is web-only, Playwright provides reliable automation
**Why JSON storage?** Simplicity, human-readable, sufficient for <10k patterns
**Why caching?** Strudel.cc interaction is slow (50-500ms), caching provides real-time UX
**Why direct CodeMirror access?** 80% faster than keyboard simulation

## Future Enhancements (See FUTURE_ENHANCEMENTS.md)
- Complete tempo/key detection
- Multi-session support
- WebWorker audio analysis
- SQLite pattern store
- MIDI/audio export
