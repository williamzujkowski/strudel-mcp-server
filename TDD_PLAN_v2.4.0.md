# TDD Plan - v2.4.0

## Overview

Test-Driven Development plan for Strudel MCP Server v2.4.0 features following strict RED-GREEN-REFACTOR methodology.

**Version:** 2.4.0
**Target Release:** Q1 2025
**Total Tests Planned:** 150 new tests
**Current Coverage:** v2.3.0 = 93.5% complete (173/176 tests passing)
**Development Approach:** Pure TDD - Write tests FIRST, then implement features

---

## RED-GREEN-REFACTOR Methodology

### Phase 1: RED (Write Failing Tests)
- Write comprehensive test specifications
- Define expected behavior and interfaces
- Create mock data and fixtures
- All tests MUST fail initially
- Document expected outputs

### Phase 2: GREEN (Minimal Implementation)
- Write simplest code to make tests pass
- No optimization yet
- Focus on correctness
- All tests MUST pass

### Phase 3: REFACTOR (Optimize & Clean)
- Improve code quality
- Remove duplication
- Optimize performance
- Tests MUST still pass

---

## Feature Priority & Timeline

| Feature | Priority | Tests | Effort | Dependencies | Week |
|---------|----------|-------|--------|--------------|------|
| Bounded History Stack | HIGH | 20 | 1 day | None | 1 |
| Enhanced Error Logging | HIGH | 25 | 1-2 days | None | 1 |
| Browser Pool | CRITICAL | 40 | 5-7 days | None | 2-3 |
| Session Manager | CRITICAL | 35 | 3-4 days | Browser Pool | 3-4 |
| WebWorker Audio | MEDIUM | 30 | 3-4 days | None | 4 |

**Total Duration:** 4 weeks (13-18 days)

---

## Test Suite Specifications

### 1. Bounded History Stack (20 tests)

**File:** `src/__tests__/BoundedHistory.test.ts`
**Implementation:** `src/utils/BoundedHistory.ts`
**Coverage Target:** 100%
**LOC Estimate:** ~150 lines implementation, ~400 lines tests

#### Purpose
Prevent memory leaks from unbounded undo/redo stacks by implementing a circular buffer with configurable maximum size.

#### Interface Definition

```typescript
export class BoundedHistory<T> {
  private readonly maxSize: number;
  private undoStack: T[];
  private redoStack: T[];

  constructor(maxSize?: number);

  push(item: T): void;
  undo(): T | null;
  redo(): T | null;
  clear(): void;
  getSize(): { undo: number; redo: number };
  getMaxSize(): number;
  isFull(): boolean;
  isEmpty(): boolean;
  peek(): T | null;
  toArray(): T[];
}
```

#### Test Categories (20 tests)

##### A. Construction & Configuration (4 tests)
1. **Constructor with default max size**
   - GIVEN: new BoundedHistory()
   - WHEN: created without arguments
   - THEN: maxSize should be 50 (default constant)

2. **Constructor with custom max size**
   - GIVEN: new BoundedHistory(100)
   - WHEN: created with custom size
   - THEN: maxSize should be 100

3. **Constructor with invalid max size (zero)**
   - GIVEN: new BoundedHistory(0)
   - WHEN: created with zero
   - THEN: should throw Error "maxSize must be > 0"

4. **Constructor with negative max size**
   - GIVEN: new BoundedHistory(-10)
   - WHEN: created with negative value
   - THEN: should throw Error "maxSize must be > 0"

##### B. Push Operations (5 tests)
5. **Push single item**
   - GIVEN: empty history
   - WHEN: push("pattern1")
   - THEN: undo stack size = 1, redo stack size = 0

6. **Push multiple items within limit**
   - GIVEN: maxSize = 50
   - WHEN: push 30 items
   - THEN: undo stack size = 30, all items retrievable

7. **Push items exceeding limit**
   - GIVEN: maxSize = 50
   - WHEN: push 60 items
   - THEN: undo stack size = 50 (oldest 10 removed)

8. **Push clears redo stack**
   - GIVEN: history with redo stack populated
   - WHEN: push new item
   - THEN: redo stack should be empty

9. **Push at exact limit boundary**
   - GIVEN: maxSize = 50, stack has 50 items
   - WHEN: push 51st item
   - THEN: oldest item removed, size stays 50

##### C. Undo Operations (4 tests)
10. **Undo single item**
    - GIVEN: stack with 1 item
    - WHEN: undo()
    - THEN: returns item, undo stack empty, redo stack has 1 item

11. **Undo multiple items**
    - GIVEN: stack with 5 items
    - WHEN: undo() called 3 times
    - THEN: undo stack = 2, redo stack = 3

12. **Undo from empty stack**
    - GIVEN: empty history
    - WHEN: undo()
    - THEN: returns null

13. **Undo all items**
    - GIVEN: stack with N items
    - WHEN: undo() N times
    - THEN: undo stack empty, redo stack has N items

##### D. Redo Operations (4 tests)
14. **Redo single item**
    - GIVEN: redo stack with 1 item
    - WHEN: redo()
    - THEN: item moved to undo stack

15. **Redo multiple items**
    - GIVEN: redo stack with 3 items
    - WHEN: redo() called twice
    - THEN: undo stack +2, redo stack -2

16. **Redo from empty stack**
    - GIVEN: empty redo stack
    - WHEN: redo()
    - THEN: returns null

17. **Redo after push (redo stack cleared)**
    - GIVEN: redo stack with items
    - WHEN: push new item, then redo()
    - THEN: redo() returns null (stack was cleared)

##### E. Edge Cases & Utilities (3 tests)
18. **Clear history**
    - GIVEN: populated history
    - WHEN: clear()
    - THEN: both stacks empty

19. **Peek without modification**
    - GIVEN: stack with items
    - WHEN: peek()
    - THEN: returns top item, stack unchanged

20. **Memory leak prevention test**
    - GIVEN: maxSize = 50
    - WHEN: push 10,000 items rapidly
    - THEN: memory usage stays bounded (≤ 50 items)

#### Mock Data

```typescript
// Test fixtures
const mockPatterns = {
  pattern1: 's("bd*4")',
  pattern2: 's("hh*8")',
  pattern3: 'stack(s("bd*4"), s("hh*8"))',
  // ... generate 100 unique patterns
};
```

#### Success Criteria
- All 20 tests pass
- 100% code coverage
- No memory leaks in stress test
- Undo/redo operations in O(1) time

---

### 2. Enhanced Error Logging (25 tests)

**File:** `src/__tests__/EnhancedLogger.test.ts`
**Implementation:** `src/utils/EnhancedLogger.ts`
**Coverage Target:** 100%
**LOC Estimate:** ~200 lines implementation, ~500 lines tests

#### Purpose
Replace silent error swallowing with structured logging that includes context, metrics, and actionable diagnostics.

#### Interface Definition

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  stackTrace?: string;
  sessionId?: string;
  operationId?: string;
}

export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  errorRate: number; // errors per minute
  lastError?: LogEntry;
  errorsByType: Map<string, number>;
}

export class EnhancedLogger {
  constructor(config?: LoggerConfig);

  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
  fatal(message: string, error?: Error, context?: Record<string, any>): void;

  setLogLevel(level: LogLevel): void;
  getLogLevel(): LogLevel;

  getMetrics(): LogMetrics;
  resetMetrics(): void;

  getLogs(filter?: LogFilter): LogEntry[];
  clearLogs(): void;

  enablePerformanceMonitoring(): void;
  getPerformanceImpact(): number; // milliseconds overhead
}

export interface LoggerConfig {
  level?: LogLevel;
  maxLogs?: number; // bounded log buffer
  enableMetrics?: boolean;
  enableStackTrace?: boolean;
  sessionId?: string;
}

export interface LogFilter {
  level?: LogLevel;
  startTime?: number;
  endTime?: number;
  messagePattern?: RegExp;
}
```

#### Test Categories (25 tests)

##### A. Log Level Management (5 tests)
1. **Default log level is INFO**
   - GIVEN: new EnhancedLogger()
   - WHEN: no level specified
   - THEN: getLogLevel() returns LogLevel.INFO

2. **Set log level to DEBUG**
   - GIVEN: logger with INFO level
   - WHEN: setLogLevel(LogLevel.DEBUG)
   - THEN: debug messages are logged

3. **Set log level to ERROR filters lower levels**
   - GIVEN: logger with ERROR level
   - WHEN: info(), warn() called
   - THEN: messages not logged, error() is logged

4. **Log level hierarchy enforcement**
   - GIVEN: level = WARN
   - WHEN: log all levels
   - THEN: only WARN, ERROR, FATAL logged

5. **Invalid log level throws error**
   - GIVEN: attempt setLogLevel(99)
   - WHEN: invalid level
   - THEN: throws Error "Invalid log level"

##### B. Structured Logging (5 tests)
6. **Log with context object**
   - GIVEN: logger
   - WHEN: info("message", { userId: 123, action: "write" })
   - THEN: log entry includes context

7. **Log with Error object**
   - GIVEN: logger
   - WHEN: error("Failed", new Error("details"))
   - THEN: log entry includes error and stack trace

8. **Log with session ID**
   - GIVEN: logger with sessionId "abc123"
   - WHEN: any log call
   - THEN: all entries include sessionId

9. **Log with operation ID**
   - GIVEN: logger tracking operation
   - WHEN: log within operation context
   - THEN: entry includes operationId

10. **Log timestamp accuracy**
    - GIVEN: logger
    - WHEN: log message
    - THEN: timestamp is Date.now() ± 10ms

##### C. Error Metrics (6 tests)
11. **Track total log count**
    - GIVEN: logger
    - WHEN: log 50 messages
    - THEN: getMetrics().totalLogs = 50

12. **Track error count**
    - GIVEN: logger
    - WHEN: 10 errors, 5 warnings
    - THEN: getMetrics().errorCount = 10

13. **Calculate error rate**
    - GIVEN: logger
    - WHEN: 6 errors in 1 minute
    - THEN: getMetrics().errorRate = 6.0

14. **Group errors by type**
    - GIVEN: logger
    - WHEN: multiple Error types logged
    - THEN: errorsByType has correct counts

15. **Last error tracking**
    - GIVEN: logger
    - WHEN: multiple errors logged
    - THEN: lastError is most recent

16. **Reset metrics**
    - GIVEN: logger with metrics
    - WHEN: resetMetrics()
    - THEN: all counters reset to 0

##### D. Log Filtering & Retrieval (5 tests)
17. **Filter by log level**
    - GIVEN: logs with mixed levels
    - WHEN: getLogs({ level: LogLevel.ERROR })
    - THEN: only ERROR and FATAL returned

18. **Filter by time range**
    - GIVEN: logs from different times
    - WHEN: getLogs({ startTime: T1, endTime: T2 })
    - THEN: only logs in range returned

19. **Filter by message pattern**
    - GIVEN: logs with various messages
    - WHEN: getLogs({ messagePattern: /pattern.*failed/ })
    - THEN: only matching messages returned

20. **Combined filters**
    - GIVEN: diverse logs
    - WHEN: multiple filter criteria
    - THEN: all filters applied (AND logic)

21. **Clear logs**
    - GIVEN: 100 log entries
    - WHEN: clearLogs()
    - THEN: getLogs() returns empty array

##### E. Performance & Bounded Logs (4 tests)
22. **Performance monitoring overhead**
    - GIVEN: logger with performance monitoring
    - WHEN: getPerformanceImpact()
    - THEN: overhead < 1ms per log

23. **Bounded log buffer (maxLogs)**
    - GIVEN: logger with maxLogs = 1000
    - WHEN: log 2000 messages
    - THEN: buffer maintains only 1000 (oldest removed)

24. **Logging doesn't block operations**
    - GIVEN: logger
    - WHEN: log within critical path
    - THEN: operation completes in < 1ms

25. **Disable stack trace for performance**
    - GIVEN: logger with enableStackTrace = false
    - WHEN: error logged
    - THEN: no stackTrace in entry, faster execution

#### Mock Data

```typescript
const mockErrors = {
  validationError: new Error('Pattern validation failed'),
  browserError: new Error('Browser disconnected'),
  audioError: new Error('Audio context unavailable'),
  // ... various error types
};

const mockContext = {
  user: { id: 'user123', session: 'sess456' },
  operation: { name: 'writePattern', duration: 120 },
  pattern: { length: 450, valid: false }
};
```

#### Success Criteria
- All 25 tests pass
- Performance overhead < 1ms
- 100% code coverage
- Error rate calculation accurate

---

### 3. Browser Pool (40 tests)

**File:** `src/__tests__/BrowserPool.test.ts`
**Implementation:** `src/controllers/BrowserPool.ts`
**Coverage Target:** 95%
**LOC Estimate:** ~350 lines implementation, ~800 lines tests

#### Purpose
Enable concurrent multi-user sessions by managing a pool of browser instances with health monitoring and graceful recycling.

#### Interface Definition

```typescript
export interface BrowserPoolConfig {
  minInstances?: number; // minimum pool size
  maxInstances?: number; // maximum pool size
  maxIdleTime?: number; // ms before recycling idle instance
  healthCheckInterval?: number; // ms between health checks
  requestTimeout?: number; // ms for instance checkout
  recycleThreshold?: number; // requests before forced recycle
}

export interface PoolInstance {
  id: string;
  browser: Browser;
  page: Page;
  status: 'idle' | 'busy' | 'unhealthy' | 'recycling';
  requestCount: number;
  lastUsed: number;
  createdAt: number;
  sessionId?: string;
}

export interface PoolMetrics {
  totalInstances: number;
  idleInstances: number;
  busyInstances: number;
  unhealthyInstances: number;
  totalRequests: number;
  avgWaitTime: number;
  recycleCount: number;
  checkoutSuccess: number;
  checkoutFailure: number;
}

export class BrowserPool {
  constructor(config?: BrowserPoolConfig);

  initialize(): Promise<void>;
  checkout(sessionId?: string): Promise<PoolInstance>;
  checkin(instanceId: string): void;

  getMetrics(): PoolMetrics;
  getHealth(): PoolHealth;

  recycleInstance(instanceId: string): Promise<void>;
  forceRecycleAll(): Promise<void>;

  shutdown(): Promise<void>;

  private createInstance(): Promise<PoolInstance>;
  private healthCheck(instance: PoolInstance): Promise<boolean>;
  private scheduleHealthChecks(): void;
  private handleIdleRecycling(): void;
}

export interface PoolHealth {
  healthy: boolean;
  issues: string[];
  uptime: number;
  instanceHealth: Map<string, boolean>;
}
```

#### Test Categories (40 tests)

##### A. Pool Initialization (6 tests)
1. **Initialize with default config**
   - GIVEN: new BrowserPool()
   - WHEN: initialize()
   - THEN: creates minInstances (default 2) browsers

2. **Initialize with custom pool size**
   - GIVEN: BrowserPool({ minInstances: 5 })
   - WHEN: initialize()
   - THEN: creates 5 instances

3. **Initialize validates min ≤ max**
   - GIVEN: { minInstances: 5, maxInstances: 3 }
   - WHEN: new BrowserPool(config)
   - THEN: throws Error "min must be ≤ max"

4. **Initialize creates working instances**
   - GIVEN: pool initialized
   - WHEN: check all instances
   - THEN: all have browser + page ready

5. **Initialize sets all instances to idle**
   - GIVEN: pool after initialize()
   - WHEN: getMetrics()
   - THEN: idleInstances = minInstances

6. **Reinitialize is idempotent**
   - GIVEN: initialized pool
   - WHEN: initialize() again
   - THEN: no new instances created

##### B. Checkout Operations (8 tests)
7. **Checkout idle instance**
   - GIVEN: pool with idle instances
   - WHEN: checkout()
   - THEN: returns instance, status = busy

8. **Checkout updates metrics**
   - GIVEN: pool
   - WHEN: checkout()
   - THEN: busyInstances +1, idleInstances -1

9. **Checkout with session affinity**
   - GIVEN: instance previously used by sessionId "abc"
   - WHEN: checkout("abc")
   - THEN: returns same instance

10. **Checkout when pool exhausted**
    - GIVEN: all instances busy
    - WHEN: checkout()
    - THEN: waits or creates new instance (if < max)

11. **Checkout timeout**
    - GIVEN: pool exhausted, requestTimeout = 5000ms
    - WHEN: checkout() waits > 5000ms
    - THEN: throws Error "Checkout timeout"

12. **Checkout creates instance on demand**
    - GIVEN: pool at minInstances, all busy
    - WHEN: checkout() and < maxInstances
    - THEN: creates new instance

13. **Checkout respects maxInstances limit**
    - GIVEN: pool at maxInstances, all busy
    - WHEN: checkout()
    - THEN: waits for checkin (doesn't create new)

14. **Checkout tracks wait time**
    - GIVEN: pool with contention
    - WHEN: checkout() waits 200ms
    - THEN: metrics.avgWaitTime reflects wait

##### C. Checkin Operations (4 tests)
15. **Checkin returns instance to pool**
    - GIVEN: checked out instance
    - WHEN: checkin(instanceId)
    - THEN: status = idle, available for checkout

16. **Checkin updates metrics**
    - GIVEN: busy instance
    - WHEN: checkin()
    - THEN: busyInstances -1, idleInstances +1

17. **Checkin non-existent instance**
    - GIVEN: invalid instanceId
    - WHEN: checkin("fake-id")
    - THEN: throws Error "Instance not found"

18. **Checkin already idle instance**
    - GIVEN: idle instance
    - WHEN: checkin(idleInstance.id)
    - THEN: no-op, no error thrown

##### D. Health Checks (6 tests)
19. **Health check on healthy instance**
    - GIVEN: working instance
    - WHEN: healthCheck(instance)
    - THEN: returns true

20. **Health check detects disconnected browser**
    - GIVEN: instance with closed browser
    - WHEN: healthCheck(instance)
    - THEN: returns false, status = unhealthy

21. **Health check detects page crash**
    - GIVEN: instance with crashed page
    - WHEN: healthCheck(instance)
    - THEN: returns false, triggers recycle

22. **Periodic health checks run**
    - GIVEN: pool with healthCheckInterval = 10000ms
    - WHEN: wait 10 seconds
    - THEN: all instances checked

23. **Unhealthy instance removed from pool**
    - GIVEN: instance fails health check
    - WHEN: next checkout()
    - THEN: unhealthy instance not returned

24. **Health check doesn't disrupt busy instance**
    - GIVEN: instance in use
    - WHEN: health check runs
    - THEN: no interruption, check postponed

##### E. Instance Recycling (7 tests)
25. **Recycle instance after threshold**
    - GIVEN: instance with requestCount = 100 (threshold)
    - WHEN: auto-recycle check
    - THEN: instance recycled, new instance created

26. **Recycle idle instance (maxIdleTime)**
    - GIVEN: instance idle for > maxIdleTime
    - WHEN: idle cleanup runs
    - THEN: instance recycled

27. **Manual recycle specific instance**
    - GIVEN: pool
    - WHEN: recycleInstance(id)
    - THEN: instance closed and replaced

28. **Recycle maintains pool size**
    - GIVEN: pool with N instances
    - WHEN: recycleInstance()
    - THEN: pool still has N instances

29. **Cannot recycle busy instance**
    - GIVEN: instance checked out
    - WHEN: recycleInstance(busyId)
    - THEN: throws Error "Cannot recycle busy instance"

30. **Force recycle all instances**
    - GIVEN: pool with mixed states
    - WHEN: forceRecycleAll()
    - THEN: all instances recycled and recreated

31. **Recycle increments metrics**
    - GIVEN: pool
    - WHEN: recycleInstance()
    - THEN: metrics.recycleCount += 1

##### F. Concurrency & Load Balancing (6 tests)
32. **Concurrent checkouts**
    - GIVEN: pool with 5 instances
    - WHEN: 5 simultaneous checkouts
    - THEN: all succeed, each gets unique instance

33. **Load balancing distributes evenly**
    - GIVEN: pool with 3 instances
    - WHEN: 30 sequential checkout/checkin cycles
    - THEN: each instance used ~10 times (±2)

34. **Parallel operations don't deadlock**
    - GIVEN: pool with 2 instances
    - WHEN: 100 concurrent operations
    - THEN: all complete successfully

35. **Checkout queue fairness (FIFO)**
    - GIVEN: pool exhausted
    - WHEN: multiple checkout() calls waiting
    - THEN: served in order received

36. **Session affinity under load**
    - GIVEN: 10 concurrent sessions
    - WHEN: each session requests 5 times
    - THEN: each session gets same instance

37. **Pool expansion under load**
    - GIVEN: minInstances = 2, maxInstances = 10
    - WHEN: 8 concurrent checkouts
    - THEN: pool expands to 8 instances

##### G. Shutdown & Cleanup (4 tests)
38. **Graceful shutdown closes all instances**
    - GIVEN: pool with 5 instances
    - WHEN: shutdown()
    - THEN: all browsers closed cleanly

39. **Shutdown waits for busy instances**
    - GIVEN: pool with 2 busy instances
    - WHEN: shutdown()
    - THEN: waits for checkin before closing

40. **Shutdown with timeout**
    - GIVEN: shutdown({ timeout: 5000 })
    - WHEN: busy instances don't checkin
    - THEN: force-close after timeout

##### H. Metrics & Monitoring (5 tests - extends to 40 total)
41. **Metrics track request count**
    - GIVEN: pool
    - WHEN: 100 checkout/checkin cycles
    - THEN: metrics.totalRequests = 100

42. **Metrics calculate average wait time**
    - GIVEN: checkouts with various wait times
    - WHEN: getMetrics()
    - THEN: avgWaitTime accurate

43. **Metrics track success/failure rates**
    - GIVEN: 90 successful, 10 failed checkouts
    - WHEN: getMetrics()
    - THEN: checkoutSuccess = 90, checkoutFailure = 10

44. **Pool health aggregation**
    - GIVEN: 5 instances, 1 unhealthy
    - WHEN: getHealth()
    - THEN: healthy = false, issues = ["Instance X unhealthy"]

45. **Metrics reset functionality**
    - GIVEN: pool with metrics
    - WHEN: resetMetrics()
    - THEN: counters reset, pool state preserved

#### Mock Data

```typescript
const mockBrowsers = {
  createHealthyBrowser: () => chromium.launch({ headless: true }),
  createUnhealthyBrowser: () => {
    const browser = chromium.launch();
    setTimeout(() => browser.close(), 100);
    return browser;
  }
};

const sessionIds = ['session1', 'session2', 'session3', /* ... */ 'session10'];
```

#### Success Criteria
- All 40 tests pass
- No race conditions in concurrent tests
- Pool handles 100+ concurrent checkouts
- Memory leaks prevented (instances cleaned up)

---

### 4. Session Manager (35 tests)

**File:** `src/__tests__/SessionManager.test.ts`
**Implementation:** `src/controllers/SessionManager.ts`
**Coverage Target:** 95%
**LOC Estimate:** ~300 lines implementation, ~700 lines tests

#### Purpose
Manage user sessions with state persistence, routing to browser pool instances, and automatic timeout/cleanup.

#### Interface Definition

```typescript
export interface SessionConfig {
  timeoutMs?: number; // session inactivity timeout
  maxSessions?: number; // limit concurrent sessions
  persistState?: boolean; // save session state
  affinityEnabled?: boolean; // sticky routing
}

export interface Session {
  id: string;
  userId?: string;
  browserInstanceId?: string;
  state: SessionState;
  createdAt: number;
  lastActivity: number;
  requestCount: number;
  metadata?: Record<string, any>;
}

export enum SessionState {
  ACTIVE = 'active',
  IDLE = 'idle',
  EXPIRED = 'expired',
  TERMINATED = 'terminated'
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  avgSessionDuration: number;
  avgRequestsPerSession: number;
  timeoutCount: number;
}

export class SessionManager {
  constructor(
    private browserPool: BrowserPool,
    config?: SessionConfig
  );

  createSession(userId?: string, metadata?: Record<string, any>): Promise<Session>;
  getSession(sessionId: string): Session | null;
  terminateSession(sessionId: string): Promise<void>;

  routeRequest(sessionId: string): Promise<PoolInstance>;
  updateActivity(sessionId: string): void;

  getMetrics(): SessionMetrics;
  getActiveSessions(): Session[];

  cleanup(): Promise<void>; // remove expired sessions

  private startTimeoutMonitor(): void;
  private handleTimeout(sessionId: string): void;
  private persistSessionState(session: Session): Promise<void>;
  private loadSessionState(sessionId: string): Promise<Session | null>;
}
```

#### Test Categories (35 tests)

##### A. Session Creation (6 tests)
1. **Create session with unique ID**
   - GIVEN: SessionManager
   - WHEN: createSession()
   - THEN: returns session with unique ID

2. **Create session with userId**
   - GIVEN: SessionManager
   - WHEN: createSession("user123")
   - THEN: session.userId = "user123"

3. **Create session with metadata**
   - GIVEN: SessionManager
   - WHEN: createSession(userId, { role: "admin" })
   - THEN: session.metadata includes role

4. **Create session assigns browser instance**
   - GIVEN: SessionManager with browser pool
   - WHEN: createSession()
   - THEN: session.browserInstanceId set (pool checkout)

5. **Create session respects maxSessions limit**
   - GIVEN: maxSessions = 10, 10 active sessions
   - WHEN: createSession()
   - THEN: throws Error "Max sessions reached"

6. **Create session initializes timestamps**
   - GIVEN: SessionManager
   - WHEN: createSession()
   - THEN: createdAt = lastActivity = Date.now()

##### B. Session Retrieval (4 tests)
7. **Get existing session**
   - GIVEN: session with ID "abc123"
   - WHEN: getSession("abc123")
   - THEN: returns correct session object

8. **Get non-existent session**
   - GIVEN: no session with ID "fake"
   - WHEN: getSession("fake")
   - THEN: returns null

9. **Get active sessions**
   - GIVEN: 5 active, 3 expired sessions
   - WHEN: getActiveSessions()
   - THEN: returns array of 5 active sessions

10. **Get session updates last access**
    - GIVEN: session
    - WHEN: getSession(id)
    - THEN: lastActivity updated (if config allows)

##### C. Session Routing (6 tests)
11. **Route request to assigned instance**
    - GIVEN: session with browserInstanceId "inst1"
    - WHEN: routeRequest(sessionId)
    - THEN: returns instance "inst1" from pool

12. **Route maintains session affinity**
    - GIVEN: affinityEnabled = true
    - WHEN: multiple routeRequest() calls
    - THEN: always returns same instance

13. **Route without affinity uses load balancing**
    - GIVEN: affinityEnabled = false
    - WHEN: routeRequest() 10 times
    - THEN: uses different instances

14. **Route updates activity timestamp**
    - GIVEN: session
    - WHEN: routeRequest()
    - THEN: session.lastActivity updated

15. **Route increments request counter**
    - GIVEN: session with requestCount = 5
    - WHEN: routeRequest()
    - THEN: requestCount = 6

16. **Route to expired session fails**
    - GIVEN: session with state = EXPIRED
    - WHEN: routeRequest(expiredId)
    - THEN: throws Error "Session expired"

##### D. Session Termination (5 tests)
17. **Terminate active session**
    - GIVEN: active session
    - WHEN: terminateSession(id)
    - THEN: state = TERMINATED, instance returned to pool

18. **Terminate session persists state**
    - GIVEN: persistState = true
    - WHEN: terminateSession(id)
    - THEN: state saved before termination

19. **Terminate non-existent session**
    - GIVEN: no session with ID
    - WHEN: terminateSession("fake")
    - THEN: throws Error "Session not found"

20. **Terminate already terminated session**
    - GIVEN: terminated session
    - WHEN: terminateSession(id) again
    - THEN: no-op, no error

21. **Terminate session increments metrics**
    - GIVEN: session
    - WHEN: terminateSession(id)
    - THEN: metrics reflect termination

##### E. Timeout Management (6 tests)
22. **Session timeout after inactivity**
    - GIVEN: timeoutMs = 5000, session idle 6000ms
    - WHEN: timeout monitor runs
    - THEN: session state = EXPIRED

23. **Activity prevents timeout**
    - GIVEN: timeoutMs = 5000
    - WHEN: updateActivity() every 2000ms
    - THEN: session never expires

24. **Timeout monitor runs periodically**
    - GIVEN: SessionManager initialized
    - WHEN: wait for monitor interval
    - THEN: expired sessions cleaned up

25. **Timeout increments metrics**
    - GIVEN: session times out
    - WHEN: timeout occurs
    - THEN: metrics.timeoutCount += 1

26. **Timeout releases browser instance**
    - GIVEN: session with assigned instance
    - WHEN: timeout occurs
    - THEN: instance returned to pool

27. **Manual activity update extends timeout**
    - GIVEN: session about to expire
    - WHEN: updateActivity(id)
    - THEN: timeout clock resets

##### F. State Persistence (5 tests)
28. **Persist session state on update**
    - GIVEN: persistState = true, session modified
    - WHEN: state changes
    - THEN: state saved to storage

29. **Load persisted session state**
    - GIVEN: persisted session data
    - WHEN: loadSessionState(id)
    - THEN: returns restored session

30. **Persist handles storage errors**
    - GIVEN: storage unavailable
    - WHEN: persistSessionState() fails
    - THEN: logs error, doesn't crash

31. **Load handles missing data**
    - GIVEN: no persisted data for ID
    - WHEN: loadSessionState("missing")
    - THEN: returns null

32. **Persist includes metadata**
    - GIVEN: session with complex metadata
    - WHEN: persist and load
    - THEN: metadata restored correctly

##### G. Metrics & Monitoring (4 tests)
33. **Track total sessions created**
    - GIVEN: 20 sessions created
    - WHEN: getMetrics()
    - THEN: totalSessions = 20

34. **Calculate average session duration**
    - GIVEN: sessions with various durations
    - WHEN: getMetrics()
    - THEN: avgSessionDuration accurate

35. **Calculate average requests per session**
    - GIVEN: sessions with varying request counts
    - WHEN: getMetrics()
    - THEN: avgRequestsPerSession accurate

##### H. Cleanup & Maintenance (4 tests - extends to 35 total)
36. **Cleanup removes expired sessions**
    - GIVEN: 3 expired, 5 active sessions
    - WHEN: cleanup()
    - THEN: only 5 active remain

37. **Cleanup releases resources**
    - GIVEN: expired sessions with instances
    - WHEN: cleanup()
    - THEN: all instances returned to pool

38. **Cleanup doesn't affect active sessions**
    - GIVEN: mixed session states
    - WHEN: cleanup()
    - THEN: active sessions unchanged

39. **Cleanup runs automatically**
    - GIVEN: SessionManager with auto-cleanup
    - WHEN: wait for cleanup interval
    - THEN: expired sessions removed

#### Mock Data

```typescript
const mockSessions = {
  activeSession: {
    id: 'sess-active-1',
    userId: 'user123',
    state: SessionState.ACTIVE,
    createdAt: Date.now() - 60000,
    lastActivity: Date.now() - 1000
  },
  expiredSession: {
    id: 'sess-expired-1',
    userId: 'user456',
    state: SessionState.EXPIRED,
    createdAt: Date.now() - 3600000,
    lastActivity: Date.now() - 3000000
  }
};
```

#### Success Criteria
- All 35 tests pass
- Session affinity works correctly
- Timeout mechanism reliable
- No memory leaks from expired sessions

---

### 5. WebWorker Audio Analysis (30 tests)

**File:** `src/__tests__/WebWorkerAudio.test.ts`
**Implementation:** `src/workers/AudioAnalysisWorker.ts`, `src/AudioAnalyzer.ts` (modified)
**Coverage Target:** 90%
**LOC Estimate:** ~250 lines implementation, ~600 lines tests

#### Purpose
Offload CPU-intensive FFT audio analysis to Web Worker to prevent main thread blocking and improve responsiveness.

#### Interface Definition

```typescript
// Worker Interface
export interface AudioAnalysisMessage {
  type: 'analyze' | 'init' | 'terminate';
  data?: {
    fftData?: Uint8Array;
    sampleRate?: number;
    options?: AnalysisOptions;
  };
  requestId?: string;
}

export interface AudioAnalysisResult {
  requestId: string;
  success: boolean;
  analysis?: AudioAnalysis;
  error?: string;
  performanceMs: number;
}

export interface AnalysisOptions {
  includeSpectrum?: boolean;
  includeTempo?: boolean;
  includeKey?: boolean;
  includeRhythm?: boolean;
}

// Modified AudioAnalyzer
export class AudioAnalyzer {
  private worker: Worker | null;
  private workerEnabled: boolean;
  private pendingRequests: Map<string, PendingRequest>;

  constructor(useWorker?: boolean);

  async analyze(
    fftData: Uint8Array,
    options?: AnalysisOptions
  ): Promise<AudioAnalysis>;

  enableWorker(): void;
  disableWorker(): void;
  isWorkerAvailable(): boolean;

  getPerformanceMetrics(): WorkerPerformanceMetrics;

  private analyzeInWorker(data: Uint8Array): Promise<AudioAnalysis>;
  private analyzeInMainThread(data: Uint8Array): Promise<AudioAnalysis>;
  private fallbackToMainThread(data: Uint8Array): Promise<AudioAnalysis>;
}

export interface PendingRequest {
  resolve: (result: AudioAnalysis) => void;
  reject: (error: Error) => void;
  startTime: number;
}

export interface WorkerPerformanceMetrics {
  workerAnalyses: number;
  mainThreadAnalyses: number;
  avgWorkerTime: number;
  avgMainThreadTime: number;
  performanceGain: number; // percentage
  failureCount: number;
}
```

#### Test Categories (30 tests)

##### A. Worker Initialization (5 tests)
1. **Initialize worker successfully**
   - GIVEN: AudioAnalyzer with useWorker = true
   - WHEN: constructor called
   - THEN: worker created and ready

2. **Initialize without worker (fallback)**
   - GIVEN: AudioAnalyzer with useWorker = false
   - WHEN: analyze() called
   - THEN: uses main thread analysis

3. **Worker initialization error handling**
   - GIVEN: Worker constructor throws error
   - WHEN: AudioAnalyzer created
   - THEN: falls back to main thread, logs warning

4. **Check worker availability**
   - GIVEN: AudioAnalyzer
   - WHEN: isWorkerAvailable()
   - THEN: returns true if worker initialized

5. **Enable/disable worker dynamically**
   - GIVEN: AudioAnalyzer
   - WHEN: disableWorker() then enableWorker()
   - THEN: worker state toggles correctly

##### B. Worker Analysis (6 tests)
6. **Analyze FFT data in worker**
   - GIVEN: worker-enabled AudioAnalyzer
   - WHEN: analyze(mockFFTData)
   - THEN: worker processes and returns result

7. **Worker analysis returns same result as main thread**
   - GIVEN: same FFT data
   - WHEN: analyze with worker vs without
   - THEN: results match (within tolerance)

8. **Worker handles multiple concurrent analyses**
   - GIVEN: worker-enabled AudioAnalyzer
   - WHEN: 10 concurrent analyze() calls
   - THEN: all complete successfully

9. **Worker analysis includes request ID**
   - GIVEN: worker analysis
   - WHEN: message sent to worker
   - THEN: includes unique requestId

10. **Worker respects analysis options**
    - GIVEN: options = { includeTempo: false }
    - WHEN: analyze(data, options)
    - THEN: tempo analysis skipped

11. **Worker analysis faster than main thread**
    - GIVEN: complex FFT data
    - WHEN: analyze with worker vs main thread
    - THEN: worker time < main thread time (20%+ improvement)

##### C. Main Thread Fallback (5 tests)
12. **Fallback when worker unavailable**
    - GIVEN: worker initialization failed
    - WHEN: analyze() called
    - THEN: uses main thread analysis

13. **Fallback when worker errors**
    - GIVEN: worker throws error
    - WHEN: analyze() called
    - THEN: catches error, falls back to main thread

14. **Fallback increments metrics**
    - GIVEN: worker failure
    - WHEN: fallback occurs
    - THEN: metrics.mainThreadAnalyses += 1

15. **Fallback logs warning**
    - GIVEN: worker failure
    - WHEN: fallback to main thread
    - THEN: warning logged with context

16. **Fallback still returns valid result**
    - GIVEN: worker crashes
    - WHEN: analyze() with fallback
    - THEN: returns valid AudioAnalysis

##### D. Data Transfer & Serialization (5 tests)
17. **Transfer FFT data efficiently**
    - GIVEN: large Uint8Array (10MB)
    - WHEN: send to worker
    - THEN: uses transferable objects (no copy)

18. **Worker receives correct data**
    - GIVEN: FFT data sent to worker
    - WHEN: worker processes
    - THEN: data integrity verified

19. **Worker returns serializable result**
    - GIVEN: worker analysis complete
    - WHEN: result sent back
    - THEN: no serialization errors

20. **Handle non-transferable data gracefully**
    - GIVEN: data that can't be transferred
    - WHEN: analyze() called
    - THEN: clones data instead

21. **Large dataset handling**
    - GIVEN: FFT data > 1MB
    - WHEN: analyze()
    - THEN: completes without memory issues

##### E. Performance Metrics (5 tests)
22. **Track worker analysis count**
    - GIVEN: 50 worker analyses
    - WHEN: getPerformanceMetrics()
    - THEN: workerAnalyses = 50

23. **Calculate average worker time**
    - GIVEN: worker analyses with varying durations
    - WHEN: getPerformanceMetrics()
    - THEN: avgWorkerTime accurate

24. **Calculate performance gain percentage**
    - GIVEN: worker avg 10ms, main thread avg 30ms
    - WHEN: getPerformanceMetrics()
    - THEN: performanceGain = 66.67%

25. **Track failure count**
    - GIVEN: 5 worker failures
    - WHEN: getPerformanceMetrics()
    - THEN: failureCount = 5

26. **Performance comparison test**
    - GIVEN: 100 analyses with/without worker
    - WHEN: compare total time
    - THEN: worker total time < main thread (20%+)

##### F. Error Handling (4 tests)
27. **Worker timeout handling**
    - GIVEN: worker doesn't respond in 5000ms
    - WHEN: analyze() waiting
    - THEN: times out, falls back to main thread

28. **Worker crash recovery**
    - GIVEN: worker crashes during analysis
    - WHEN: next analyze() called
    - THEN: creates new worker, continues

29. **Corrupted data error**
    - GIVEN: invalid FFT data sent to worker
    - WHEN: worker attempts analysis
    - THEN: returns error, doesn't crash

30. **Promise rejection on worker error**
    - GIVEN: worker error occurs
    - WHEN: pending analyze() promise
    - THEN: promise rejected with error message

#### Mock Data

```typescript
const mockFFTData = {
  small: new Uint8Array(512).fill(128),
  large: new Uint8Array(8192).map(() => Math.random() * 255),
  complex: generateComplexFFT({ peaks: [440, 880, 1320], noise: 0.1 })
};

const mockWorkerMessages = {
  success: {
    type: 'result',
    requestId: 'req-123',
    success: true,
    analysis: { /* ... */ },
    performanceMs: 12
  },
  error: {
    type: 'result',
    requestId: 'req-456',
    success: false,
    error: 'Analysis failed'
  }
};
```

#### Success Criteria
- All 30 tests pass
- Worker analysis 20-30% faster than main thread
- Graceful fallback on errors
- No memory leaks from pending requests

---

## Implementation Timeline

### Week 1: Foundation (2 features)
**Days 1-2: Bounded History Stack**
- RED: Write all 20 tests (4 hours)
- GREEN: Implement BoundedHistory class (3 hours)
- REFACTOR: Optimize, add JSDoc (1 hour)

**Days 3-4: Enhanced Error Logging**
- RED: Write all 25 tests (5 hours)
- GREEN: Implement EnhancedLogger (4 hours)
- REFACTOR: Integrate with existing code (2 hours)

### Week 2-3: Scalability (2 features)
**Days 5-11: Browser Pool**
- RED: Write all 40 tests (8 hours)
- GREEN: Implement BrowserPool (12 hours)
- REFACTOR: Performance tuning, monitoring (4 hours)

**Days 12-15: Session Manager**
- RED: Write all 35 tests (7 hours)
- GREEN: Implement SessionManager (10 hours)
- REFACTOR: State persistence, cleanup (3 hours)

### Week 4: Performance (1 feature)
**Days 16-18: WebWorker Audio**
- RED: Write all 30 tests (6 hours)
- GREEN: Implement worker and integration (8 hours)
- REFACTOR: Optimize data transfer (2 hours)

**Days 19-20: Final Integration & Documentation**
- Integration tests for all features
- Update README and CHANGELOG
- Performance benchmarking
- Create migration guide

---

## Dependencies & Integration

### Feature Dependencies

```
Browser Pool → Session Manager → Enhanced Logging
                ↓
          WebWorker Audio
                ↓
          Bounded History
```

**Dependency Graph:**
- **Bounded History:** No dependencies (standalone utility)
- **Enhanced Logging:** No dependencies (standalone utility)
- **Browser Pool:** Uses Enhanced Logging
- **Session Manager:** Requires Browser Pool, uses Enhanced Logging
- **WebWorker Audio:** Uses Enhanced Logging, Bounded History (optional)

### Integration Points

1. **StrudelController modifications:**
   - Add `getHistory()` method returning BoundedHistory
   - Replace Logger with EnhancedLogger
   - Support multi-session routing

2. **EnhancedMCPServerFixed modifications:**
   - Initialize SessionManager
   - Route tool calls through SessionManager
   - Add session ID to request context

3. **AudioAnalyzer modifications:**
   - Add worker support
   - Maintain backward compatibility

---

## Testing Strategy

### Unit Tests
- Each feature has isolated unit tests
- Mock all external dependencies
- Test edge cases and error paths
- 95%+ code coverage required

### Integration Tests
- Cross-feature integration tests
- Browser Pool + Session Manager integration
- Worker + AudioAnalyzer integration
- Performance regression tests

### Performance Tests
- BrowserPool: Handle 100+ concurrent checkouts
- SessionManager: Manage 50+ concurrent sessions
- WebWorker: 20-30% performance improvement
- EnhancedLogger: < 1ms overhead per log

### Load Tests
- Stress test with 1000+ operations
- Memory leak detection
- Resource cleanup verification

---

## Success Criteria

### Functional Requirements
- [ ] All 150 tests pass
- [ ] 95%+ code coverage
- [ ] No breaking changes to existing API
- [ ] Backward compatible

### Performance Requirements
- [ ] BrowserPool handles 100+ concurrent sessions
- [ ] SessionManager overhead < 5ms per request
- [ ] WebWorker 20-30% faster than main thread
- [ ] EnhancedLogger overhead < 1ms per log
- [ ] Bounded History operations O(1)

### Quality Requirements
- [ ] All functions have JSDoc
- [ ] No TypeScript `any` types
- [ ] ESLint passes with no warnings
- [ ] All error paths tested
- [ ] Integration tests pass

### Documentation Requirements
- [ ] README updated with new features
- [ ] API documentation complete
- [ ] Migration guide for v2.3.0 → v2.4.0
- [ ] Performance benchmarks documented

---

## Risk Mitigation

### Technical Risks

**Risk 1: Browser Pool Concurrency Issues**
- *Mitigation:* Extensive concurrency tests, use locks/mutexes
- *Fallback:* Queue-based serialization

**Risk 2: WebWorker Browser Compatibility**
- *Mitigation:* Feature detection, automatic fallback
- *Fallback:* Main thread analysis always available

**Risk 3: Session State Persistence Failure**
- *Mitigation:* Error handling, graceful degradation
- *Fallback:* In-memory only (no persistence)

**Risk 4: Memory Leaks in Long-Running Instances**
- *Mitigation:* Aggressive testing, monitoring
- *Fallback:* Automatic instance recycling

### Schedule Risks

**Risk 1: Browser Pool Takes Longer Than Estimated**
- *Mitigation:* Start early, daily progress tracking
- *Fallback:* Reduce scope (defer load balancing)

**Risk 2: Integration Issues Between Features**
- *Mitigation:* Continuous integration testing
- *Fallback:* Feature flags for gradual rollout

---

## Test Execution Commands

```bash
# Run all v2.4.0 tests
npm test -- --testPathPattern="BoundedHistory|EnhancedLogger|BrowserPool|SessionManager|WebWorkerAudio"

# Run specific feature tests
npm test -- BoundedHistory.test.ts
npm test -- EnhancedLogger.test.ts
npm test -- BrowserPool.test.ts
npm test -- SessionManager.test.ts
npm test -- WebWorkerAudio.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern="v2.4.0"

# Watch mode for TDD
npm test:watch -- BoundedHistory.test.ts
```

---

## Next Steps

1. **Immediate:** Review and approve this TDD plan
2. **Day 1:** Start RED phase for Bounded History Stack
3. **Weekly:** Review progress, adjust estimates
4. **End of Week 4:** Final integration testing
5. **Release:** v2.4.0 published to npm

---

## Appendix: Test Data Requirements

### Bounded History Test Data
- 100 unique pattern strings
- Edge cases: empty string, very long strings (10KB+)
- Unicode characters, special symbols

### Browser Pool Test Data
- Mock Browser/Page objects
- Simulated crash scenarios
- Load profiles (low, medium, high concurrency)

### Session Manager Test Data
- 50+ unique session IDs
- Various user IDs and metadata
- Timestamp sequences for timeout testing

### WebWorker Audio Test Data
- FFT arrays of varying sizes (512, 1024, 2048, 4096, 8192)
- Known audio signatures (pure tones, white noise, silence)
- Performance benchmark datasets

### Enhanced Logger Test Data
- Error objects with various stack traces
- Complex context objects
- High-frequency log generation (1000+ logs/second)

---

**Document Version:** 1.0
**Created:** 2025-10-23
**Author:** Future-Planner Agent (Hive Mind Swarm)
**Status:** READY FOR IMPLEMENTATION
