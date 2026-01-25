/**
 * StrudelEngine - Local Strudel pattern engine for Node.js
 *
 * Executes Strudel patterns without browser automation.
 * Uses @strudel/core, @strudel/mini, and @strudel/transpiler for:
 * - Pattern validation with precise error locations
 * - Event querying for pattern analysis
 * - Syntax checking without browser overhead
 *
 * Note: Audio playback still requires browser (Playwright) - this is for
 * validation and analysis only.
 *
 * @module services/StrudelEngine
 */

import * as strudelCore from '@strudel/core';
import { mini } from '@strudel/mini';
import { transpiler } from '@strudel/transpiler';

/**
 * Result of pattern transpilation
 */
export interface TranspileResult {
  /** Whether transpilation succeeded */
  success: boolean;
  /** Transpiled JavaScript code (if successful) */
  transpiledCode?: string;
  /** Error message (if failed) */
  error?: string;
  /** Error location in source code */
  errorLocation?: {
    line: number;
    column: number;
    offset: number;
  };
  /** Source locations for mini notation strings */
  locations?: Array<{
    start: number;
    end: number;
    value?: string;
    name?: string;
  }>;
}

/**
 * Result of pattern validation
 */
export interface LocalValidationResult {
  /** Whether pattern is valid */
  valid: boolean;
  /** List of errors found */
  errors: string[];
  /** List of warnings */
  warnings: string[];
  /** Suggestions for fixing issues */
  suggestions: string[];
  /** Error location if applicable */
  errorLocation?: {
    line: number;
    column: number;
  };
}

/**
 * A single pattern event (hap)
 */
export interface PatternEvent {
  /** Event value (e.g., { s: 'bd' } for sounds) */
  value: any;
  /** Start time in cycles */
  start: number;
  /** End time in cycles */
  end: number;
  /** Whether this is a whole event or partial */
  isWhole: boolean;
  /** Context information */
  context?: Record<string, any>;
}

/**
 * Pattern metadata extracted from analysis
 */
export interface PatternMetadata {
  /** Estimated events per cycle */
  eventsPerCycle: number;
  /** Unique values in pattern */
  uniqueValues: string[];
  /** Whether pattern uses sound (s) */
  usesSound: boolean;
  /** Whether pattern uses note */
  usesNote: boolean;
  /** Whether pattern is a stack/layer */
  isStack: boolean;
  /** Detected functions used in pattern */
  functionsUsed: string[];
  /** Estimated complexity (0-1) */
  complexity: number;
  /** BPM if setcpm is present */
  bpm?: number;
}

/**
 * Local Strudel pattern engine - executes patterns without browser.
 * Replaces fragile browser automation for pattern validation and analysis.
 *
 * @example
 * ```typescript
 * const engine = new StrudelEngine();
 *
 * // Validate a pattern
 * const validation = engine.validate('s("bd hh").fast(2)');
 * if (validation.valid) {
 *   console.log('Pattern is valid');
 * }
 *
 * // Query events
 * const events = engine.queryEvents('s("bd hh sd hh")', 0, 2);
 * console.log(`Found ${events.length} events in 2 cycles`);
 * ```
 */
export class StrudelEngine {
  /** Execution context with Strudel functions */
  private readonly context: Record<string, any>;

  constructor() {
    // Build execution context with all Strudel functions
    this.context = {
      ...strudelCore,
      m: mini,
      mini,
    };
  }

  /**
   * Transpile a Strudel pattern to JavaScript
   *
   * @param code - Strudel pattern code
   * @returns Transpilation result with code or error
   *
   * @example
   * ```typescript
   * const result = engine.transpile('s("bd hh").fast(2)');
   * if (result.success) {
   *   console.log('Transpiled:', result.transpiledCode);
   * }
   * ```
   */
  transpile(code: string): TranspileResult {
    if (!code || code.trim().length === 0) {
      return {
        success: false,
        error: 'Empty pattern',
        errorLocation: { line: 1, column: 1, offset: 0 },
      };
    }

    try {
      const result = transpiler(code);
      return {
        success: true,
        transpiledCode: result.output,
        locations: result.locations || [],
      };
    } catch (error: any) {
      // Parse error location from Strudel/acorn errors
      const location = this.parseErrorLocation(error);
      return {
        success: false,
        error: error.message || 'Transpilation failed',
        errorLocation: location,
      };
    }
  }

  /**
   * Validate pattern syntax without execution
   *
   * @param code - Strudel pattern code
   * @returns Validation result with errors and suggestions
   *
   * @example
   * ```typescript
   * const result = engine.validate('s("bd hh").fast(');
   * if (!result.valid) {
   *   console.log('Errors:', result.errors);
   * }
   * ```
   */
  validate(code: string): LocalValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Empty check
    if (!code || code.trim().length === 0) {
      return {
        valid: false,
        errors: ['Pattern is empty'],
        warnings: [],
        suggestions: ['Add a pattern like: s("bd hh sd hh")'],
      };
    }

    // Try transpilation first - catches syntax errors
    const transpileResult = this.transpile(code);
    if (!transpileResult.success) {
      return {
        valid: false,
        errors: [transpileResult.error || 'Syntax error'],
        warnings,
        suggestions: this.getSuggestionsForError(transpileResult.error || ''),
        errorLocation: transpileResult.errorLocation
          ? { line: transpileResult.errorLocation.line, column: transpileResult.errorLocation.column }
          : undefined,
      };
    }

    // Try to evaluate the pattern to catch runtime errors
    try {
      const fn = new Function(...Object.keys(this.context), transpileResult.transpiledCode!);
      const pattern = fn(...Object.values(this.context));

      // Verify it's a valid pattern
      if (!pattern || typeof pattern.queryArc !== 'function') {
        errors.push('Code did not produce a valid pattern');
        suggestions.push('Ensure your code returns a pattern (e.g., s("bd"), note("c3"), stack(...))');
      }
    } catch (error: any) {
      errors.push(`Runtime error: ${error.message}`);
      suggestions.push(...this.getSuggestionsForError(error.message));
    }

    // Check for common issues
    this.checkCommonIssues(code, warnings, suggestions);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Query pattern events for a time range
   *
   * @param code - Strudel pattern code
   * @param start - Start time in cycles
   * @param end - End time in cycles
   * @returns Array of pattern events
   * @throws {Error} If pattern is invalid
   *
   * @example
   * ```typescript
   * const events = engine.queryEvents('s("bd hh sd hh")', 0, 2);
   * events.forEach(e => {
   *   console.log(`${e.value} at ${e.start}-${e.end}`);
   * });
   * ```
   */
  queryEvents(code: string, start: number, end: number): PatternEvent[] {
    const transpileResult = this.transpile(code);
    if (!transpileResult.success) {
      throw new Error(`Transpilation failed: ${transpileResult.error}`);
    }

    try {
      const fn = new Function(...Object.keys(this.context), transpileResult.transpiledCode!);
      const pattern = fn(...Object.values(this.context));

      if (!pattern || typeof pattern.queryArc !== 'function') {
        throw new Error('Code did not produce a valid pattern');
      }

      const haps = pattern.queryArc(start, end);
      return haps.map((hap: any) => this.hapToEvent(hap));
    } catch (error: any) {
      throw new Error(`Pattern execution failed: ${error.message}`);
    }
  }

  /**
   * Execute a pattern and return the compiled pattern object
   *
   * @param code - Strudel pattern code
   * @returns Compiled pattern object
   * @throws {Error} If pattern is invalid
   */
  compile(code: string): any {
    const transpileResult = this.transpile(code);
    if (!transpileResult.success) {
      throw new Error(`Transpilation failed: ${transpileResult.error}`);
    }

    try {
      const fn = new Function(...Object.keys(this.context), transpileResult.transpiledCode!);
      const pattern = fn(...Object.values(this.context));

      if (!pattern || typeof pattern.queryArc !== 'function') {
        throw new Error('Code did not produce a valid pattern');
      }

      return pattern;
    } catch (error: any) {
      throw new Error(`Pattern execution failed: ${error.message}`);
    }
  }

  /**
   * Extract pattern metadata by analyzing events and code
   *
   * @param code - Strudel pattern code
   * @returns Pattern metadata
   *
   * @example
   * ```typescript
   * const meta = engine.analyzePattern('s("bd hh").fast(2)');
   * console.log('Events per cycle:', meta.eventsPerCycle);
   * console.log('Complexity:', meta.complexity);
   * ```
   */
  analyzePattern(code: string): PatternMetadata {
    // Default metadata
    const metadata: PatternMetadata = {
      eventsPerCycle: 0,
      uniqueValues: [],
      usesSound: false,
      usesNote: false,
      isStack: false,
      functionsUsed: [],
      complexity: 0,
    };

    // Extract BPM from setcpm
    const bpmMatch = code.match(/setcpm\s*\(\s*(\d+(?:\.\d+)?)\s*\)/);
    if (bpmMatch) {
      metadata.bpm = parseFloat(bpmMatch[1]);
    }

    // Analyze code structure
    metadata.usesSound = /\bs\s*\(/.test(code) || /\bsound\s*\(/.test(code);
    metadata.usesNote = /\bnote\s*\(/.test(code);
    metadata.isStack = /\bstack\s*\(/.test(code);

    // Extract function names used
    const funcMatches = code.match(/\b([a-z][a-zA-Z0-9_]*)\s*\(/g);
    if (funcMatches) {
      const funcNames = funcMatches.map(m => m.replace(/\s*\($/, ''));
      metadata.functionsUsed = [...new Set(funcNames)];
    }

    // Try to query events for detailed analysis
    try {
      const events = this.queryEvents(code, 0, 1);
      metadata.eventsPerCycle = events.length;

      // Extract unique values
      const values = events.map(e => {
        if (typeof e.value === 'object' && e.value !== null) {
          return e.value.s || e.value.note || e.value.n || JSON.stringify(e.value);
        }
        return String(e.value);
      });
      metadata.uniqueValues = [...new Set(values)];

      // Calculate complexity based on various factors
      const complexityFactors = [
        Math.min(events.length / 16, 1) * 0.3, // Event density
        Math.min(metadata.uniqueValues.length / 8, 1) * 0.2, // Variety
        Math.min(metadata.functionsUsed.length / 10, 1) * 0.3, // Function complexity
        metadata.isStack ? 0.1 : 0, // Layering
        (code.length / 500) * 0.1, // Code length
      ];
      metadata.complexity = Math.min(complexityFactors.reduce((a, b) => a + b, 0), 1);
    } catch {
      // If we can't query events, estimate from code
      metadata.complexity = Math.min(
        (metadata.functionsUsed.length / 10) * 0.5 +
        (code.length / 500) * 0.3 +
        (metadata.isStack ? 0.2 : 0),
        1
      );
    }

    return metadata;
  }

  /**
   * Convert a Strudel Hap to our PatternEvent format
   */
  private hapToEvent(hap: any): PatternEvent {
    return {
      value: hap.value,
      start: hap.whole?.begin?.valueOf() ?? hap.part.begin.valueOf(),
      end: hap.whole?.end?.valueOf() ?? hap.part.end.valueOf(),
      isWhole: hap.whole !== undefined,
      context: hap.context,
    };
  }

  /**
   * Parse error location from various error formats
   */
  private parseErrorLocation(error: any): { line: number; column: number; offset: number } | undefined {
    // Acorn-style location
    if (error.loc) {
      return {
        line: error.loc.line,
        column: error.loc.column,
        offset: error.pos || 0,
      };
    }

    // Strudel mini SyntaxError
    if (error.location) {
      return {
        line: error.location.start.line,
        column: error.location.start.column,
        offset: error.location.start.offset,
      };
    }

    // Try to parse from message
    const lineColMatch = error.message?.match(/line\s*(\d+).*column\s*(\d+)/i);
    if (lineColMatch) {
      return {
        line: parseInt(lineColMatch[1]),
        column: parseInt(lineColMatch[2]),
        offset: 0,
      };
    }

    return undefined;
  }

  /**
   * Get suggestions based on error message
   */
  private getSuggestionsForError(error: string): string[] {
    const suggestions: string[] = [];
    const lowerError = error.toLowerCase();

    if (lowerError.includes('unexpected token')) {
      suggestions.push('Check for missing quotes, parentheses, or brackets');
      suggestions.push('Ensure all function calls have matching ()');
    }

    if (lowerError.includes('is not defined')) {
      const match = error.match(/(\w+) is not defined/);
      if (match) {
        suggestions.push(`"${match[1]}" is not a known Strudel function`);
        suggestions.push('Check spelling or use a valid function like s(), note(), stack()');
      }
    }

    if (lowerError.includes('not a function')) {
      suggestions.push('Check that you are calling methods on a pattern object');
    }

    if (lowerError.includes('unexpected end')) {
      suggestions.push('Pattern appears incomplete - check for missing closing brackets');
    }

    return suggestions;
  }

  /**
   * Check for common issues in pattern code
   */
  private checkCommonIssues(code: string, warnings: string[], suggestions: string[]): void {
    // Check for high gain values
    const gainMatches = code.match(/\.gain\s*\(\s*(\d+(?:\.\d+)?)\s*\)/g);
    if (gainMatches) {
      for (const match of gainMatches) {
        const value = parseFloat(match.match(/(\d+(?:\.\d+)?)/)?.[1] || '0');
        if (value > 2) {
          warnings.push(`High gain value (${value}) may cause distortion`);
        }
        if (value > 5) {
          warnings.push(`Dangerous gain value (${value}) - consider reducing to 2 or less`);
        }
      }
    }

    // Check for missing sound-producing functions
    if (!/\b(s|sound|note|n)\s*\(/.test(code) && !/\bstack\s*\(/.test(code)) {
      warnings.push('Pattern may not produce sound - no s(), note(), or stack() found');
      suggestions.push('Add a sound source like s("bd") or note("c3")');
    }

    // Suggest tempo if not set
    if (!/setcpm|setbpm|cpm|bpm/.test(code)) {
      suggestions.push('Consider setting tempo with setcpm(120)');
    }
  }
}
