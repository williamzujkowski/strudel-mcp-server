/**
 * PatternValidator - Validates Strudel patterns before execution
 * Provides syntax checking and error recovery for generated patterns
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class PatternValidator {
  /**
   * Validates a Strudel pattern for syntax errors
   * @param pattern - The pattern code to validate
   * @returns ValidationResult with errors and suggestions
   */
  validate(pattern: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for empty pattern
    if (!pattern || pattern.trim().length === 0) {
      errors.push('Pattern is empty');
      suggestions.push('Add a simple pattern like: s("bd*4")');
      return { valid: false, errors, warnings, suggestions };
    }

    // Check for balanced parentheses
    const parenCheck = this.checkBalancedParentheses(pattern);
    if (!parenCheck.valid) {
      errors.push(`Unbalanced parentheses: ${parenCheck.message}`);
      suggestions.push('Check that all ( ) [ ] { } are properly matched');
    }

    // Check for balanced quotes
    const quoteCheck = this.checkBalancedQuotes(pattern);
    if (!quoteCheck.valid) {
      errors.push(`Unbalanced quotes: ${quoteCheck.message}`);
      suggestions.push('Ensure all strings are properly quoted');
    }

    // Check for common Strudel syntax patterns
    const syntaxCheck = this.checkStrudelSyntax(pattern);
    warnings.push(...syntaxCheck.warnings);
    suggestions.push(...syntaxCheck.suggestions);

    // Check for dangerous operations
    const safetyCheck = this.checkSafety(pattern);
    if (!safetyCheck.safe) {
      errors.push(...safetyCheck.errors);
    }
    warnings.push(...safetyCheck.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Checks if parentheses, brackets, and braces are balanced
   */
  private checkBalancedParentheses(pattern: string): { valid: boolean; message: string } {
    const stack: string[] = [];
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
    const opening = Object.keys(pairs);
    const closing = Object.values(pairs);

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];

      if (opening.includes(char)) {
        stack.push(char);
      } else if (closing.includes(char)) {
        if (stack.length === 0) {
          return { valid: false, message: `Unexpected closing '${char}' at position ${i}` };
        }
        const last = stack.pop()!;
        if (pairs[last] !== char) {
          return { valid: false, message: `Mismatched '${last}' and '${char}' at position ${i}` };
        }
      }
    }

    if (stack.length > 0) {
      return { valid: false, message: `Unclosed '${stack[stack.length - 1]}'` };
    }

    return { valid: true, message: '' };
  }

  /**
   * Checks if quotes are balanced
   */
  private checkBalancedQuotes(pattern: string): { valid: boolean; message: string } {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      const prevChar = i > 0 ? pattern[i - 1] : '';

      // Skip escaped quotes
      if (prevChar === '\\') {
        continue;
      }

      if (char === "'" && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
      }
    }

    if (inSingleQuote) {
      return { valid: false, message: 'Unclosed single quote' };
    }
    if (inDoubleQuote) {
      return { valid: false, message: 'Unclosed double quote' };
    }
    if (inBacktick) {
      return { valid: false, message: 'Unclosed backtick' };
    }

    return { valid: true, message: '' };
  }

  /**
   * Checks for common Strudel syntax patterns and potential issues
   */
  private checkStrudelSyntax(pattern: string): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for common Strudel functions
    const hasSound = /s\(/.test(pattern);
    const hasNote = /note\(/.test(pattern);
    const hasStack = /stack\(/.test(pattern);

    if (!hasSound && !hasNote && !hasStack) {
      warnings.push('Pattern may not produce sound - no s(), note(), or stack() found');
      suggestions.push('Try adding s("bd*4") for a basic kick drum pattern');
    }

    // Check for common mistakes
    if (/s\([^"']/.test(pattern)) {
      warnings.push('Sound patterns should be in quotes: s("bd") not s(bd)');
    }

    // Check for undefined variables
    const functionCalls = pattern.match(/\b([a-z_][a-z0-9_]*)\s*\(/gi);
    if (functionCalls) {
      const knownFunctions = [
        's', 'note', 'stack', 'setcpm', 'sound', 'n', 'room', 'delay',
        'reverb', 'fast', 'slow', 'rev', 'iter', 'jux', 'every', 'sometimes',
        'rarely', 'often', 'gain', 'pan', 'cutoff', 'resonance', 'attack',
        'release', 'sustain', 'decay', 'lpf', 'hpf', 'bpf', 'struct', 'euclid',
        'euclidLegacy', 'choose', 'chooseWith', 'range', 'sine', 'saw', 'square',
        'tri', 'rand', 'perlin', 'add', 'sub', 'mul', 'div', 'mod', 'pow',
        'min', 'max', 'floor', 'ceil', 'round'
      ];

      functionCalls.forEach(call => {
        const funcName = call.replace(/\s*\($/, '').toLowerCase();
        if (!knownFunctions.includes(funcName)) {
          warnings.push(`Unknown function: ${funcName}`);
        }
      });
    }

    // Check for tempo setting
    if (!pattern.includes('setcpm') && !pattern.includes('cpm')) {
      suggestions.push('Consider adding setcpm(120) to set tempo');
    }

    return { warnings, suggestions };
  }

  /**
   * Checks for potentially dangerous operations
   */
  private checkSafety(pattern: string): { safe: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for excessive gain that could damage speakers
    const gainMatches = pattern.match(/\.gain\(([0-9.]+)\)/g);
    if (gainMatches) {
      gainMatches.forEach(match => {
        const gainValue = parseFloat(match.match(/([0-9.]+)/)?.[0] || '0');
        if (gainValue > 2) {
          warnings.push(`High gain value detected: ${gainValue} - may be too loud`);
        }
        if (gainValue > 5) {
          errors.push(`Dangerous gain value: ${gainValue} - reduced to 2.0 for safety`);
        }
      });
    }

    // Check for potentially infinite loops
    if (/while\s*\(true\)/.test(pattern) || /for\s*\(.*;;.*\)/.test(pattern)) {
      errors.push('Potential infinite loop detected');
    }

    // Check for eval or similar dangerous functions
    if (/\beval\(/.test(pattern) || /Function\(/.test(pattern)) {
      errors.push('Use of eval() or Function() is not allowed');
    }

    return {
      safe: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Attempts to auto-fix common pattern errors
   * @param pattern - The pattern to fix
   * @returns Fixed pattern with applied corrections
   */
  autoFix(pattern: string): { pattern: string; fixes: string[] } {
    const fixes: string[] = [];
    let fixed = pattern;

    // Fix excessive gain values
    fixed = fixed.replace(/\.gain\(([0-9.]+)\)/g, (match, value) => {
      const gainValue = parseFloat(value);
      if (gainValue > 2) {
        fixes.push(`Reduced gain from ${gainValue} to 2.0`);
        return '.gain(2.0)';
      }
      return match;
    });

    // Add missing quotes around sound patterns
    fixed = fixed.replace(/s\(([a-z0-9*]+)\)/gi, (match, sound) => {
      if (!sound.includes('"') && !sound.includes("'")) {
        fixes.push(`Added quotes around sound: ${sound}`);
        return `s("${sound}")`;
      }
      return match;
    });

    return { pattern: fixed, fixes };
  }

  /**
   * Provides helpful suggestions based on pattern analysis
   * @param pattern - The pattern to analyze
   * @returns Array of suggestions for improvement
   */
  suggest(pattern: string): string[] {
    const suggestions: string[] = [];

    // Suggest adding effects if pattern is plain
    if (!pattern.includes('room') && !pattern.includes('delay') && !pattern.includes('reverb')) {
      suggestions.push('Consider adding spatial effects: .room(0.5) or .delay(0.25)');
    }

    // Suggest adding variation
    if (!pattern.includes('sometimes') && !pattern.includes('every')) {
      suggestions.push('Add variation with .sometimes() or .every()');
    }

    // Suggest structure if pattern is very simple
    if (pattern.length < 30 && pattern.includes('s(')) {
      suggestions.push('Try stacking multiple patterns with stack()');
    }

    // Suggest tempo control
    if (!pattern.includes('setcpm') && !pattern.includes('cpm')) {
      suggestions.push('Set tempo with setcpm(120) at the beginning');
    }

    return suggestions;
  }
}
