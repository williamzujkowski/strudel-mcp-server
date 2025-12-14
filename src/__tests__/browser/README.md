# Browser Validation Tests

Real browser tests using Playwright automation against strudel.cc.

## Running Browser Tests

```bash
# Run browser tests (without coverage)
npm run test:browser

# Run with specific headless mode
HEADLESS=true npm run test:browser

# Run browser tests without coverage instrumentation
npm run test:nocov -- --testPathPattern=browser
```

## Coverage Incompatibility

**IMPORTANT:** These tests are automatically skipped when running with `--coverage`.

### Why?

Jest's coverage instrumentation injects variables like `cov_s6r97yh8f` into the compiled code. When code from `StrudelController` or `AudioAnalyzer` runs inside `page.evaluate()`, it executes in the browser context where Jest's coverage variables don't exist, causing:

```
ReferenceError: cov_s6r97yh8f is not defined
```

### How it works

The test file checks for coverage at runtime:

```typescript
const isRunningCoverage = process.env.COVERAGE === 'true' ||
                          process.env.npm_lifecycle_event?.includes('coverage') ||
                          process.argv.some(arg => arg.includes('--coverage')) ||
                          typeof (global as any).__coverage__ !== 'undefined';
const describeOrSkip = isRunningCoverage ? describe.skip : describe;
```

## Test Structure

- **Techno Examples:** hard-techno.json, minimal-techno.json
- **House Examples:** deep-house.json, tech-house.json
- **Drum & Bass Examples:** liquid-dnb.json, neurofunk.json
- **Ambient Examples:** dark-ambient.json, drone.json
- **Trap Examples:** modern-trap.json, cloud-trap.json
- **Jungle Examples:** classic-jungle.json, ragga-jungle.json
- **Jazz Examples:** bebop.json, modal-jazz.json
- **Audio Analysis:** Tempo detection, key detection, spectrum analysis
- **Pattern Integrity:** Metadata validation

## Timeouts

Browser tests have 30 second timeout (increased from default 5s):

```typescript
jest.setTimeout(30000);
```

## CI/CD

In CI environments (`CI=true`), tests run in headless mode automatically.
