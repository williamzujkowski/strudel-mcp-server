# TDD Quick Start Guide - v2.4.0

## 🎯 Purpose

This is your quick reference for implementing v2.4.0 features using Test-Driven Development.
Refer to `TDD_PLAN_v2.4.0.md` for complete specifications.

---

## 📋 Implementation Checklist

### Week 1: Foundation

#### Day 1-2: Bounded History Stack
- [ ] Create `src/utils/BoundedHistory.ts` (empty class)
- [ ] Create `src/__tests__/BoundedHistory.test.ts`
- [ ] RED: Write all 20 tests (all should fail)
- [ ] GREEN: Implement minimal code to pass tests
- [ ] REFACTOR: Optimize and add JSDoc
- [ ] Verify: `npm test -- BoundedHistory.test.ts` (all pass)

#### Day 3-4: Enhanced Error Logging
- [ ] Create `src/utils/EnhancedLogger.ts` (empty class)
- [ ] Create `src/__tests__/EnhancedLogger.test.ts`
- [ ] RED: Write all 25 tests (all should fail)
- [ ] GREEN: Implement minimal code to pass tests
- [ ] REFACTOR: Optimize and integrate with existing code
- [ ] Verify: `npm test -- EnhancedLogger.test.ts` (all pass)

### Week 2-3: Scalability

#### Day 5-11: Browser Pool
- [ ] Create `src/controllers/BrowserPool.ts` (empty class)
- [ ] Create `src/__tests__/BrowserPool.test.ts`
- [ ] RED: Write all 40 tests (all should fail)
- [ ] GREEN: Implement basic pool mechanics
- [ ] GREEN: Implement health checks and recycling
- [ ] REFACTOR: Optimize concurrency handling
- [ ] Verify: `npm test -- BrowserPool.test.ts` (all pass)

#### Day 12-15: Session Manager
- [ ] Create `src/controllers/SessionManager.ts` (empty class)
- [ ] Create `src/__tests__/SessionManager.test.ts`
- [ ] RED: Write all 35 tests (all should fail)
- [ ] GREEN: Implement session lifecycle
- [ ] GREEN: Implement routing and timeouts
- [ ] REFACTOR: Add state persistence
- [ ] Verify: `npm test -- SessionManager.test.ts` (all pass)

### Week 4: Performance

#### Day 16-18: WebWorker Audio
- [ ] Create `src/workers/AudioAnalysisWorker.ts` (empty worker)
- [ ] Create `src/__tests__/WebWorkerAudio.test.ts`
- [ ] Modify `src/AudioAnalyzer.ts` for worker support
- [ ] RED: Write all 30 tests (all should fail)
- [ ] GREEN: Implement worker communication
- [ ] GREEN: Implement fallback mechanism
- [ ] REFACTOR: Optimize data transfer
- [ ] Verify: `npm test -- WebWorkerAudio.test.ts` (all pass)

#### Day 19-20: Integration
- [ ] Run full test suite: `npm test`
- [ ] Integration tests for cross-feature interactions
- [ ] Performance benchmarks
- [ ] Update README.md
- [ ] Update CHANGELOG.md
- [ ] Create migration guide

---

## 🔴 RED Phase Template

For each feature, start with this pattern:

```typescript
// src/__tests__/FeatureName.test.ts

describe('FeatureName', () => {
  describe('Category 1', () => {
    test('Test 1: should do X when Y', () => {
      // GIVEN: setup conditions
      const feature = new FeatureName();

      // WHEN: perform action
      const result = feature.doSomething();

      // THEN: verify outcome
      expect(result).toBe(expectedValue);
    });

    // ... more tests
  });

  // ... more categories
});
```

**Expected Outcome:** All tests fail (no implementation yet)

---

## 🟢 GREEN Phase Template

For each feature, implement minimal code:

```typescript
// src/utils/FeatureName.ts

export class FeatureName {
  // Simplest implementation that makes tests pass
  doSomething(): string {
    return 'expected value';
  }
}
```

**Expected Outcome:** All tests pass (even if implementation is naive)

---

## 🔵 REFACTOR Phase Template

Improve the implementation:

```typescript
// src/utils/FeatureName.ts

/**
 * Brief description of what this class does
 * @example
 * ```typescript
 * const feature = new FeatureName();
 * feature.doSomething();
 * ```
 */
export class FeatureName {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Does something efficiently
   * @param input - The input parameter
   * @returns The result
   */
  doSomething(input?: string): string {
    // Optimized implementation
    if (this.cache.has(input)) {
      return this.cache.get(input);
    }

    const result = this.computeResult(input);
    this.cache.set(input, result);
    return result;
  }

  private computeResult(input?: string): string {
    // Complex logic here
    return 'result';
  }
}
```

**Expected Outcome:** All tests still pass, code is cleaner and faster

---

## 📝 Test Structure Examples

### Example 1: Bounded History Stack

```typescript
// src/__tests__/BoundedHistory.test.ts

import { BoundedHistory } from '../utils/BoundedHistory';

describe('BoundedHistory', () => {
  let history: BoundedHistory<string>;

  beforeEach(() => {
    history = new BoundedHistory<string>(50);
  });

  describe('Construction & Configuration', () => {
    test('should create with default max size', () => {
      const defaultHistory = new BoundedHistory();
      expect(defaultHistory.getMaxSize()).toBe(50);
    });

    test('should create with custom max size', () => {
      const customHistory = new BoundedHistory(100);
      expect(customHistory.getMaxSize()).toBe(100);
    });

    test('should throw error for zero max size', () => {
      expect(() => new BoundedHistory(0))
        .toThrow('maxSize must be > 0');
    });
  });

  describe('Push Operations', () => {
    test('should push single item', () => {
      history.push('pattern1');
      expect(history.getSize().undo).toBe(1);
      expect(history.getSize().redo).toBe(0);
    });

    test('should push items exceeding limit', () => {
      for (let i = 0; i < 60; i++) {
        history.push(`pattern${i}`);
      }
      expect(history.getSize().undo).toBe(50);
    });
  });

  // ... more test categories
});
```

### Example 2: Enhanced Logger

```typescript
// src/__tests__/EnhancedLogger.test.ts

import { EnhancedLogger, LogLevel } from '../utils/EnhancedLogger';

describe('EnhancedLogger', () => {
  let logger: EnhancedLogger;

  beforeEach(() => {
    logger = new EnhancedLogger();
  });

  describe('Log Level Management', () => {
    test('should default to INFO level', () => {
      expect(logger.getLogLevel()).toBe(LogLevel.INFO);
    });

    test('should set log level to DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('test message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
    });
  });

  describe('Error Metrics', () => {
    test('should track error count', () => {
      logger.error('error 1');
      logger.error('error 2');
      logger.warn('warning');

      const metrics = logger.getMetrics();
      expect(metrics.errorCount).toBe(2);
    });
  });
});
```

### Example 3: Browser Pool

```typescript
// src/__tests__/BrowserPool.test.ts

import { BrowserPool } from '../controllers/BrowserPool';
import { chromium } from 'playwright';

jest.mock('playwright');

describe('BrowserPool', () => {
  let pool: BrowserPool;

  beforeEach(async () => {
    pool = new BrowserPool({ minInstances: 2, maxInstances: 5 });
    await pool.initialize();
  });

  afterEach(async () => {
    await pool.shutdown();
  });

  describe('Pool Initialization', () => {
    test('should create minimum instances', () => {
      const metrics = pool.getMetrics();
      expect(metrics.totalInstances).toBe(2);
    });
  });

  describe('Checkout Operations', () => {
    test('should checkout idle instance', async () => {
      const instance = await pool.checkout();

      expect(instance).toBeDefined();
      expect(instance.status).toBe('busy');
    });

    test('should timeout when pool exhausted', async () => {
      await pool.checkout();
      await pool.checkout();

      await expect(
        pool.checkout({ timeout: 100 })
      ).rejects.toThrow('Checkout timeout');
    });
  });
});
```

---

## 🧪 Mock Data Generators

### Pattern Fixtures

```typescript
// src/__tests__/utils/TestFixtures.ts

export const generatePatterns = (count: number): string[] => {
  return Array.from({ length: count }, (_, i) =>
    `s("bd*${i % 8}").stack(s("hh*${i % 16}"))`
  );
};

export const samplePatterns = {
  simple: 's("bd*4")',
  complex: 'stack(s("bd*4"), s("hh*8")).fast(2).room(0.5)',
  techno: 's("[bd*4, hh*8, sd*2]").lpf(800)',
  house: 's("[bd, ~, hh, ~]*4").room(0.3)',
};
```

### Browser Mock

```typescript
// src/__tests__/utils/MockBrowser.ts

export class MockBrowser {
  private _isConnected = true;

  isConnected(): boolean {
    return this._isConnected;
  }

  async close(): Promise<void> {
    this._isConnected = false;
  }

  async newContext(): Promise<MockContext> {
    return new MockContext();
  }
}

export class MockContext {
  async newPage(): Promise<MockPage> {
    return new MockPage();
  }
}

export class MockPage {
  private content = '';

  async evaluate(fn: Function): Promise<any> {
    return fn();
  }

  async waitForSelector(selector: string): Promise<void> {
    // Mock implementation
  }

  setContent(text: string): void {
    this.content = text;
  }

  getContent(): string {
    return this.content;
  }
}
```

---

## ⚡ Performance Testing

### Benchmark Template

```typescript
describe('Performance', () => {
  test('should perform operation in < 10ms', async () => {
    const start = Date.now();

    // Perform operation
    await feature.doSomething();

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10);
  });

  test('should handle 1000 operations efficiently', async () => {
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      await feature.doSomething();
    }

    const duration = Date.now() - start;
    const avgDuration = duration / 1000;

    expect(avgDuration).toBeLessThan(1); // < 1ms per operation
  });
});
```

### Memory Leak Test

```typescript
test('should not leak memory', () => {
  const initialMemory = process.memoryUsage().heapUsed;

  // Perform many operations
  for (let i = 0; i < 10000; i++) {
    history.push(`pattern${i}`);
  }

  // Force garbage collection (if enabled with --expose-gc)
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const growth = finalMemory - initialMemory;

  // Memory should not grow significantly
  expect(growth).toBeLessThan(1024 * 1024 * 10); // < 10MB
});
```

---

## 🔍 Common Patterns

### Pattern 1: GIVEN-WHEN-THEN

```typescript
test('should do X when Y', () => {
  // GIVEN: setup preconditions
  const feature = new FeatureName();
  feature.configure({ option: true });

  // WHEN: perform action
  const result = feature.doSomething();

  // THEN: verify expectations
  expect(result).toBe(expectedValue);
  expect(feature.getState()).toBe('expected state');
});
```

### Pattern 2: Async Testing

```typescript
test('should handle async operation', async () => {
  const promise = feature.doAsyncOperation();

  await expect(promise).resolves.toBe('success');

  const result = await promise;
  expect(result).toBeDefined();
});
```

### Pattern 3: Error Testing

```typescript
test('should throw error on invalid input', () => {
  expect(() => {
    feature.doSomething(invalidInput);
  }).toThrow('Expected error message');

  expect(() => {
    feature.doSomething(null);
  }).toThrow(ValidationError);
});
```

### Pattern 4: Mock Verification

```typescript
test('should call dependency method', () => {
  const mockDependency = {
    method: jest.fn().mockReturnValue('value')
  };

  const feature = new FeatureName(mockDependency);
  feature.doSomething();

  expect(mockDependency.method).toHaveBeenCalledTimes(1);
  expect(mockDependency.method).toHaveBeenCalledWith('expected arg');
});
```

---

## 🚨 Debugging Failed Tests

### Debug Checklist

1. **Read error message carefully**
   ```
   Expected: 50
   Received: 51
   ```

2. **Add console.log for debugging**
   ```typescript
   console.log('Current state:', feature.getState());
   console.log('Expected:', expectedValue);
   console.log('Actual:', actualValue);
   ```

3. **Use `.only` to focus on one test**
   ```typescript
   test.only('should do X', () => {
     // Only this test runs
   });
   ```

4. **Check mock setup**
   ```typescript
   console.log('Mock calls:', mockFn.mock.calls);
   ```

5. **Run with verbose mode**
   ```bash
   npm test -- --verbose BoundedHistory.test.ts
   ```

---

## 📊 Progress Tracking

### Daily Checklist

**Day 1: Bounded History RED Phase**
- [ ] Create empty class
- [ ] Write 4 construction tests (fail)
- [ ] Write 5 push operation tests (fail)
- [ ] Write 4 undo operation tests (fail)
- [ ] Write 4 redo operation tests (fail)
- [ ] Write 3 edge case tests (fail)
- [ ] Total: 20 tests, all failing ✅

**Day 2: Bounded History GREEN + REFACTOR**
- [ ] Implement constructor
- [ ] Implement push() method
- [ ] Implement undo() method
- [ ] Implement redo() method
- [ ] Implement utility methods
- [ ] All tests passing ✅
- [ ] Add JSDoc
- [ ] Optimize performance
- [ ] Code review

---

## 🎯 Success Metrics

Track these metrics for each feature:

| Metric | Target | Actual |
|--------|--------|--------|
| Tests Written | See plan | ___ |
| Tests Passing | 100% | ___% |
| Code Coverage | 95%+ | ___% |
| Performance | See spec | ___ |
| JSDoc Coverage | 100% | ___% |

---

## 📚 Reference Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- BoundedHistory.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode (auto-rerun on changes)
npm test:watch -- BoundedHistory.test.ts

# Run only tests matching pattern
npm test -- --testNamePattern="should push"

# Verbose output
npm test -- --verbose

# Update snapshots
npm test -- -u

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Check TypeScript compilation
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

---

## 🔗 Quick Links

- **Full TDD Plan:** `/home/william/git/strudel-mcp-server/TDD_PLAN_v2.4.0.md`
- **Summary:** `/home/william/git/strudel-mcp-server/TDD_PLAN_v2.4.0_SUMMARY.md`
- **Enhancement Roadmap:** `/home/william/git/strudel-mcp-server/FUTURE_ENHANCEMENTS.md`
- **Existing Tests:** `/home/william/git/strudel-mcp-server/src/__tests__/`

---

## 💡 Tips for Success

1. **Write tests first, always**
   - Don't be tempted to write implementation first
   - Tests document expected behavior

2. **Start simple**
   - GREEN phase should be minimal
   - REFACTOR phase is where optimization happens

3. **One test at a time**
   - Make one test pass before moving to next
   - Commit after each passing test

4. **Use descriptive test names**
   - "should X when Y" format
   - Anyone should understand what's being tested

5. **Test edge cases**
   - null, undefined, empty strings
   - Boundary values (0, max, min)
   - Error conditions

6. **Keep tests independent**
   - Each test should run in isolation
   - Use beforeEach/afterEach for setup/teardown

7. **Don't repeat yourself**
   - Extract common test fixtures
   - Use helper functions

8. **Test behavior, not implementation**
   - Focus on public API
   - Don't test private methods directly

---

**Ready to start? Begin with Bounded History Stack!** 🚀

```bash
# Create the test file
touch src/__tests__/BoundedHistory.test.ts

# Create the implementation file
touch src/utils/BoundedHistory.ts

# Start watch mode
npm test:watch -- BoundedHistory.test.ts

# Write your first RED test!
```
