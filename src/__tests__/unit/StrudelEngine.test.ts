/**
 * StrudelEngine Unit Tests
 *
 * Tests for local Strudel pattern execution, validation, and analysis.
 * Uses the mock implementation (from __mocks__/StrudelEngine.ts) to avoid
 * ES module issues with Jest.
 *
 * For real integration tests with actual Strudel packages,
 * use node --experimental-vm-modules flag with Jest
 * or run manual tests with the actual module.
 */

// Use the mock implementation instead of the real one
jest.mock('../../services/StrudelEngine');

import { StrudelEngine } from '../../services/StrudelEngine';

describe('StrudelEngine (mocked)', () => {
  let engine: StrudelEngine;

  beforeEach(() => {
    engine = new StrudelEngine();
  });

  describe('transpile', () => {
    describe('successful transpilation', () => {
      test('should transpile simple sound pattern', () => {
        const result = engine.transpile('s("bd hh sd hh")');

        expect(result.success).toBe(true);
        expect(result.transpiledCode).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      test('should transpile pattern with method chain', () => {
        const result = engine.transpile('s("bd hh").fast(2).gain(0.8)');

        expect(result.success).toBe(true);
        expect(result.transpiledCode).toBeDefined();
      });

      test('should transpile stack patterns', () => {
        const result = engine.transpile('stack(s("bd*4"), s("hh*8"))');

        expect(result.success).toBe(true);
        expect(result.transpiledCode).toBeDefined();
      });

      test('should transpile note patterns', () => {
        const result = engine.transpile('note("c3 e3 g3 b3")');

        expect(result.success).toBe(true);
        expect(result.transpiledCode).toBeDefined();
      });
    });

    describe('failed transpilation', () => {
      test('should fail for empty pattern', () => {
        const result = engine.transpile('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Empty pattern');
        expect(result.errorLocation).toEqual({ line: 1, column: 1, offset: 0 });
      });

      test('should fail for whitespace-only pattern', () => {
        const result = engine.transpile('   \n  \t  ');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Empty pattern');
      });

      test('should fail for syntax error - unclosed parenthesis', () => {
        const result = engine.transpile('s("bd hh"');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validate', () => {
    describe('valid patterns', () => {
      test('should validate simple sound pattern', () => {
        const result = engine.validate('s("bd hh sd hh")');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should validate pattern with effects', () => {
        const result = engine.validate('s("bd hh").fast(2).room(0.5)');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should provide suggestions for valid patterns', () => {
        const result = engine.validate('s("bd")');

        expect(result.valid).toBe(true);
        // Should suggest tempo setting
        expect(result.suggestions.some(s => s.includes('setcpm'))).toBe(true);
      });
    });

    describe('invalid patterns', () => {
      test('should reject empty pattern', () => {
        const result = engine.validate('');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Pattern is empty');
      });

      test('should reject syntax errors', () => {
        const result = engine.validate('s("bd hh"');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('warnings', () => {
      test('should warn about high gain values', () => {
        const result = engine.validate('s("bd").gain(3)');

        expect(result.warnings.some(w => w.includes('gain'))).toBe(true);
      });

      test('should warn about dangerous gain values', () => {
        const result = engine.validate('s("bd").gain(10)');

        expect(result.warnings.some(w => w.includes('gain'))).toBe(true);
      });
    });
  });

  describe('queryEvents', () => {
    describe('successful queries', () => {
      test('should query events from simple pattern', () => {
        const events = engine.queryEvents('s("bd hh sd hh")', 0, 1);

        // Mock returns 4 events for 4 sounds in pattern
        expect(events.length).toBe(4);
        expect(events[0].value).toEqual({ s: 'bd' });
        expect(events[1].value).toEqual({ s: 'hh' });
        expect(events[2].value).toEqual({ s: 'sd' });
        expect(events[3].value).toEqual({ s: 'hh' });
      });

      test('should return events with timing information', () => {
        const events = engine.queryEvents('s("bd sd")', 0, 1);

        expect(events.length).toBe(2);
        expect(events[0].start).toBe(0);
        expect(events[0].end).toBe(0.5);
        expect(events[1].start).toBe(0.5);
        expect(events[1].end).toBe(1);
      });

      test('should return events for multiple cycles', () => {
        const events = engine.queryEvents('s("bd sd")', 0, 2);

        expect(events.length).toBe(4);
      });
    });

    describe('failed queries', () => {
      test('should throw for invalid pattern', () => {
        expect(() => {
          engine.queryEvents('s("bd"', 0, 1);
        }).toThrow(/Transpilation failed/);
      });

      test('should throw for empty pattern', () => {
        expect(() => {
          engine.queryEvents('', 0, 1);
        }).toThrow(/Transpilation failed/);
      });
    });
  });

  describe('compile', () => {
    test('should compile pattern and return pattern object', () => {
      const pattern = engine.compile('s("bd hh")');

      expect(pattern).toBeDefined();
      expect(typeof pattern.queryArc).toBe('function');
    });

    test('should throw for invalid pattern', () => {
      expect(() => {
        engine.compile('s("bd"');
      }).toThrow();
    });
  });

  describe('analyzePattern', () => {
    describe('basic analysis', () => {
      test('should detect sound usage', () => {
        const meta = engine.analyzePattern('s("bd hh sd hh")');

        expect(meta.usesSound).toBe(true);
        expect(meta.usesNote).toBe(false);
      });

      test('should detect note usage', () => {
        const meta = engine.analyzePattern('note("c3 e3 g3")');

        expect(meta.usesNote).toBe(true);
      });

      test('should detect stack usage', () => {
        const meta = engine.analyzePattern('stack(s("bd"), s("hh"))');

        expect(meta.isStack).toBe(true);
      });

      test('should extract BPM from setcpm', () => {
        const meta = engine.analyzePattern('setcpm(140); s("bd*4")');

        expect(meta.bpm).toBe(140);
      });

      test('should count events per cycle', () => {
        const meta = engine.analyzePattern('s("bd hh sd hh")');

        expect(meta.eventsPerCycle).toBe(4);
      });
    });

    describe('function detection', () => {
      test('should detect functions used', () => {
        const meta = engine.analyzePattern('s("bd").fast(2).room(0.5)');

        expect(meta.functionsUsed).toContain('s');
        expect(meta.functionsUsed).toContain('fast');
        expect(meta.functionsUsed).toContain('room');
      });
    });

    describe('complexity calculation', () => {
      test('should return complexity as a number', () => {
        const meta = engine.analyzePattern('s("bd")');

        expect(typeof meta.complexity).toBe('number');
        expect(meta.complexity).toBeGreaterThanOrEqual(0);
        expect(meta.complexity).toBeLessThanOrEqual(1);
      });

      test('should return higher complexity for complex patterns', () => {
        const simpleMeta = engine.analyzePattern('s("bd")');
        const complexMeta = engine.analyzePattern(`
          stack(
            s("bd*4 bd*8").fast(2).gain(0.9).room(0.3),
            s("hh*16").gain(0.6),
            note("c3 e3 g3 b3").slow(2).room(0.5)
          )
        `);

        expect(complexMeta.complexity).toBeGreaterThan(simpleMeta.complexity);
      });
    });
  });

  describe('edge cases', () => {
    test('should handle patterns with newlines', () => {
      const result = engine.validate(`
        s("bd hh")
          .fast(2)
          .room(0.5)
      `);

      // Multiline patterns should validate
      expect(result).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should handle very long patterns', () => {
      const longPattern = `s("${Array(50).fill('bd hh').join(' ')}")`;
      const result = engine.validate(longPattern);

      // Should not crash or timeout
      expect(result).toBeDefined();
    });

    test('should provide unique values in analysis', () => {
      const meta = engine.analyzePattern('s("bd hh sd hh")');

      // Should have 3 unique values (bd, hh, sd)
      expect(meta.uniqueValues.length).toBe(3);
      expect(meta.uniqueValues).toContain('bd');
      expect(meta.uniqueValues).toContain('hh');
      expect(meta.uniqueValues).toContain('sd');
    });
  });
});
