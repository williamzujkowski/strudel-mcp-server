# Future Enhancements Roadmap

## Overview
This document outlines planned enhancements for the Strudel MCP Server, prioritized by impact and feasibility.

---

## High Priority (Next Release - v2.3.0)

### 1. Complete Audio Analysis Features
**Status**: Stubbed
**Impact**: HIGH
**Effort**: 4-5 days

**Missing Features**:
- BPM/tempo detection (currently returns mock data)
- Key detection (currently returns mock data)
- Rhythm pattern analysis (partial implementation)

**Implementation Approach**:
- BPM: Autocorrelation or beat tracking algorithm
- Key: Pitch class distribution (Krumhansl-Schmuckler)
- Rhythm: Onset detection with peak picking

**Files to Modify**:
- `src/AudioAnalyzer.ts` - Implement real algorithms
- `src/__tests__/AudioAnalyzer.test.ts` - Add comprehensive tests

### 2. Add JSDoc Documentation
**Status**: Partial (new utils have JSDoc, old code missing)
**Impact**: MEDIUM
**Effort**: 2-3 days

**Coverage Needed**:
- All public methods in EnhancedMCPServerFixed
- All public methods in StrudelController
- All public methods in AudioAnalyzer (except inject/getAnalysis)
- All public methods in MusicTheory
- All public methods in PatternGenerator

**Template**:
```typescript
/**
 * Brief description of what the method does
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {Error} When/why errors are thrown
 * @example
 * ```typescript
 * const result = method(param);
 * ```
 */
```

### 3. Add Parameter Validation
**Status**: Missing for many tools
**Impact**: MEDIUM
**Effort**: 2 days

**Validations Needed**:
- BPM range: 20-300
- Gain range: 0-2.0
- Euclidean hits <= steps
- Scale/chord name validation
- String length limits

**Implementation**:
- Create `src/utils/InputValidator.ts`
- Apply in `EnhancedMCPServerFixed.executeTool()`

### 4. Fix Integration Test Import Issue
**Status**: Failing (1 test suite)
**Impact**: LOW (functional code works)
**Effort**: 1 day

**Issue**: MCP SDK uses ES modules, Jest needs configuration
**Solution**: Update `jest.config.js` with proper module transformation

---

## Medium Priority (v2.4.0 - Q1 2025)

### 5. Multi-Session Support
**Impact**: HIGH for scalability
**Effort**: 5-7 days

**Current Limitation**: Single browser instance, cannot handle concurrent users

**Proposed Architecture**:
- Browser connection pool (3-5 instances)
- Session routing by user ID or random assignment
- Graceful instance recycling
- Load balancing

**Files to Create**:
- `src/controllers/BrowserPool.ts`
- `src/controllers/SessionManager.ts`

**Files to Modify**:
- `src/server/EnhancedMCPServerFixed.ts` - Add session routing
- `src/StrudelController.ts` - Support instance ID

### 6. Bounded History Stack
**Impact**: MEDIUM (prevents memory leaks)
**Effort**: 1 day

**Current Issue**: Undo/redo stacks grow unbounded

**Solution**:
```typescript
private readonly MAX_HISTORY = 50;

private pushUndo(pattern: string): void {
  this.undoStack.push(pattern);
  if (this.undoStack.length > this.MAX_HISTORY) {
    this.undoStack.shift();
  }
}
```

### 7. WebWorker Audio Analysis
**Impact**: MEDIUM (20-30% performance improvement)
**Effort**: 3-4 days

**Benefit**: Offload FFT computation from main thread

**Implementation**:
- Create `src/workers/AudioAnalysisWorker.ts`
- Modify `src/AudioAnalyzer.ts` to use Worker
- Use SharedArrayBuffer for efficient data transfer

### 8. Enhanced Error Logging
**Impact**: MEDIUM (better debugging)
**Effort**: 1-2 days

**Current Issue**: Silent error swallowing in PatternStore

**Solution**:
- Log all caught errors with context
- Add error metrics to PerformanceMonitor
- Create error rate alerts

---

## Low Priority (v2.5.0+ - Q2 2025)

### 9. SQLite Pattern Store
**Impact**: HIGH for large libraries (1000+ patterns)
**Effort**: 3-5 days

**Current Limitation**: File-based storage scales linearly

**Benefits**:
- 50% faster queries for large libraries
- Full-text search
- Pattern relationships (derivedFrom, variations)
- Transaction support

**Implementation**:
- Add `better-sqlite3` dependency
- Create `src/storage/SQLitePatternStore.ts`
- Migration tool from JSON to SQLite

### 10. Pattern Compilation Cache
**Impact**: MEDIUM (60% faster for complex patterns)
**Effort**: 3-4 days

**Idea**: Cache validated/processed patterns

**Implementation**:
- Parse pattern once, cache AST
- Reuse for variations
- Invalidate on edit

### 11. Incremental Editor Updates
**Impact**: MEDIUM (70% faster for large patterns)
**Effort**: 4-5 days

**Current**: Rewrites entire editor content
**Proposed**: Update only changed sections

**Implementation**:
- Diff old vs new pattern
- Apply minimal CodeMirror changes
- Preserve cursor position

### 12. MIDI/Audio Export
**Impact**: LOW (nice to have)
**Effort**: 7-10 days

**Features**:
- Export pattern as MIDI file
- Render pattern to WAV/MP3
- Integration with Tone.js Transport

**Files to Create**:
- `src/exporters/MIDIExporter.ts`
- `src/exporters/AudioRenderer.ts`

### 13. Pattern Visualization
**Impact**: LOW
**Effort**: 5-7 days

**Features**:
- ASCII piano roll representation
- Waveform preview
- Spectrum visualization

---

## Research & Exploration (No Timeline)

### 14. Machine Learning Pattern Generation
**Impact**: HIGH (innovation)
**Effort**: 20+ days

**Ideas**:
- Train on user patterns
- Style transfer between patterns
- Continuation prediction
- Anomaly detection (unusual patterns)

**Technologies**:
- TensorFlow.js for in-browser inference
- LSTM for sequence generation
- VAE for style transfer

### 15. Collaborative Editing
**Impact**: MEDIUM
**Effort**: 15+ days

**Features**:
- Multi-user pattern editing
- Operational transformation (OT) or CRDT
- Real-time synchronization
- Pattern sharing and remixing

**Technologies**:
- WebSocket server
- Yjs or Automerge for CRDT
- Presence awareness

### 16. DAW Integration
**Impact**: MEDIUM
**Effort**: 10+ days

**Features**:
- Ableton Live Link
- Export to FL Studio
- REAPER integration

---

## Technical Debt

### TD-1: Refactor EnhancedMCPServerFixed
**Priority**: MEDIUM
**Effort**: 3-5 days

**Issue**: God class (847 lines), handles too many responsibilities

**Solution**: Split into:
- `MCPServer.ts` - Protocol handling only
- `ToolRegistry.ts` - Tool definitions
- `ToolExecutor.ts` - Execution logic
- `SessionManager.ts` - State management

### TD-2: Type Safety Improvements
**Priority**: LOW
**Effort**: 2-3 days

**Issues**:
- Replace `any` types (16+ instances)
- Add explicit return types
- Create proper Window interface extension

### TD-3: Magic Number Constants
**Priority**: LOW
**Effort**: 1 day

**Solution**:
```typescript
// src/config/constants.ts
export const CACHE_TTL = {
  EDITOR: 100, // ms
  AUDIO: 50,   // ms
  PATTERN_LIST: 5000 // ms
};

export const LIMITS = {
  BPM_MIN: 20,
  BPM_MAX: 300,
  GAIN_MAX: 2.0,
  HISTORY_SIZE: 50
};
```

---

## Performance Optimization Opportunities

### PO-1: Native Audio Analysis
**Impact**: 80% improvement potential
**Effort**: 7-10 days

**Approach**: Use native Node.js addons for FFT (FFTW)

### PO-2: Pattern Minification
**Impact**: 30% smaller patterns
**Effort**: 2 days

**Approach**: Remove whitespace, shorten function names

### PO-3: Lazy Initialization
**Impact**: 50% faster startup
**Effort**: 2 days

**Approach**: Initialize browser only when first tool called

---

## Implementation Priority Matrix

| Enhancement | Impact | Effort | Priority | Target Version |
|-------------|--------|--------|----------|----------------|
| Complete Audio Analysis | HIGH | 4-5 days | 1 | v2.3.0 |
| Add JSDoc | MEDIUM | 2-3 days | 2 | v2.3.0 |
| Parameter Validation | MEDIUM | 2 days | 3 | v2.3.0 |
| Fix Integration Test | LOW | 1 day | 4 | v2.3.0 |
| Multi-Session Support | HIGH | 5-7 days | 5 | v2.4.0 |
| Bounded History | MEDIUM | 1 day | 6 | v2.4.0 |
| WebWorker Audio | MEDIUM | 3-4 days | 7 | v2.4.0 |
| Enhanced Logging | MEDIUM | 1-2 days | 8 | v2.4.0 |
| SQLite Store | HIGH | 3-5 days | 9 | v2.5.0 |
| Pattern Compilation Cache | MEDIUM | 3-4 days | 10 | v2.5.0 |

---

## Contributing

To work on any of these enhancements:

1. Create feature branch: `git checkout -b feature/enhancement-name`
2. Reference this document in PR description
3. Update this file when enhancement is completed
4. Add tests for new functionality
5. Update README.md and CHANGELOG.md

## Tracking

Track progress using GitHub Issues with labels:
- `enhancement` - New features
- `technical-debt` - Code refactoring
- `performance` - Optimization work
- `research` - Exploratory work

---

**Last Updated**: 2025-10-23
**Next Review**: v2.3.0 release
