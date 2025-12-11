# TDD Implementation Plan for v2.3.0

## Overview
This document outlines a Test-Driven Development approach for implementing high-priority enhancements from FUTURE_ENHANCEMENTS.md.

**Target Version**: v2.3.0
**Estimated Effort**: 8-10 days
**Methodology**: Red-Green-Refactor TDD cycles

---

## High Priority Items

### 1. Parameter Validation (Priority 3)
### 2. Complete Audio Analysis Features (Priority 1)
### 3. Fix Jest ES Module Import Issue (Priority 4)

---

## Part 1: Parameter Validation (2 days)

### Goals
- Validate BPM range: 20-300
- Validate gain range: 0-2.0
- Validate Euclidean hits <= steps
- Validate scale/chord names
- Validate string length limits
- Provide clear error messages

### TDD Workflow

#### Phase 1.1: Create InputValidator Tests (Red)

**File**: `/home/william/git/strudel-mcp-server/src/__tests__/InputValidator.test.ts`

```typescript
import { InputValidator } from '../utils/InputValidator';

describe('InputValidator', () => {
  describe('validateBPM', () => {
    test('should accept valid BPM values', () => {
      expect(InputValidator.validateBPM(120)).toEqual({ valid: true, value: 120 });
      expect(InputValidator.validateBPM(20)).toEqual({ valid: true, value: 20 });
      expect(InputValidator.validateBPM(300)).toEqual({ valid: true, value: 300 });
    });

    test('should reject BPM below minimum', () => {
      const result = InputValidator.validateBPM(10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BPM must be between 20 and 300');
    });

    test('should reject BPM above maximum', () => {
      const result = InputValidator.validateBPM(500);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BPM must be between 20 and 300');
    });

    test('should reject non-numeric BPM', () => {
      const result = InputValidator.validateBPM(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('BPM must be a valid number');
    });

    test('should round fractional BPM values', () => {
      expect(InputValidator.validateBPM(120.7)).toEqual({ valid: true, value: 121 });
    });
  });

  describe('validateGain', () => {
    test('should accept valid gain values', () => {
      expect(InputValidator.validateGain(1.0)).toEqual({ valid: true, value: 1.0 });
      expect(InputValidator.validateGain(0.0)).toEqual({ valid: true, value: 0.0 });
      expect(InputValidator.validateGain(2.0)).toEqual({ valid: true, value: 2.0 });
    });

    test('should reject negative gain', () => {
      const result = InputValidator.validateGain(-0.5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Gain must be between 0 and 2.0');
    });

    test('should reject gain above maximum', () => {
      const result = InputValidator.validateGain(3.0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Gain must be between 0 and 2.0');
    });

    test('should handle edge case of exactly 0 and 2.0', () => {
      expect(InputValidator.validateGain(0).valid).toBe(true);
      expect(InputValidator.validateGain(2.0).valid).toBe(true);
    });
  });

  describe('validateEuclideanParams', () => {
    test('should accept valid Euclidean parameters', () => {
      expect(InputValidator.validateEuclideanParams(5, 8)).toEqual({
        valid: true,
        hits: 5,
        steps: 8
      });
    });

    test('should reject when hits exceed steps', () => {
      const result = InputValidator.validateEuclideanParams(10, 8);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hits (10) cannot exceed steps (8)');
    });

    test('should reject non-positive values', () => {
      expect(InputValidator.validateEuclideanParams(0, 8).valid).toBe(false);
      expect(InputValidator.validateEuclideanParams(5, 0).valid).toBe(false);
      expect(InputValidator.validateEuclideanParams(-1, 8).valid).toBe(false);
    });

    test('should reject non-integer values', () => {
      const result = InputValidator.validateEuclideanParams(5.5, 8);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Hits and steps must be positive integers');
    });
  });

  describe('validateScaleName', () => {
    test('should accept valid scale names', () => {
      const validScales = ['major', 'minor', 'dorian', 'pentatonic', 'blues'];
      validScales.forEach(scale => {
        expect(InputValidator.validateScaleName(scale)).toEqual({
          valid: true,
          value: scale
        });
      });
    });

    test('should reject invalid scale names', () => {
      const result = InputValidator.validateScaleName('invalid_scale');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid scale name');
      expect(result.error).toContain('Valid scales: major, minor');
    });

    test('should be case-insensitive', () => {
      expect(InputValidator.validateScaleName('MAJOR')).toEqual({
        valid: true,
        value: 'major'
      });
    });
  });

  describe('validateChordProgressionStyle', () => {
    test('should accept valid progression styles', () => {
      const validStyles = ['pop', 'jazz', 'blues', 'folk', 'rock'];
      validStyles.forEach(style => {
        expect(InputValidator.validateChordProgressionStyle(style)).toEqual({
          valid: true,
          value: style
        });
      });
    });

    test('should reject invalid styles', () => {
      const result = InputValidator.validateChordProgressionStyle('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid progression style');
    });
  });

  describe('validateNoteName', () => {
    test('should accept valid note names', () => {
      const validNotes = ['C', 'D#', 'F', 'G#', 'Bb'];
      validNotes.forEach(note => {
        expect(InputValidator.validateNoteName(note).valid).toBe(true);
      });
    });

    test('should reject invalid note names', () => {
      const result = InputValidator.validateNoteName('H');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid note name');
    });

    test('should normalize note names', () => {
      expect(InputValidator.validateNoteName('c')).toEqual({
        valid: true,
        value: 'C'
      });
    });
  });

  describe('validateStringLength', () => {
    test('should accept strings within length limits', () => {
      expect(InputValidator.validateStringLength('test', 1, 10)).toEqual({
        valid: true,
        value: 'test'
      });
    });

    test('should reject strings that are too short', () => {
      const result = InputValidator.validateStringLength('a', 2, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be between 2 and 10 characters');
    });

    test('should reject strings that are too long', () => {
      const result = InputValidator.validateStringLength('a'.repeat(100), 1, 50);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be between 1 and 50 characters');
    });
  });

  describe('validateToolArguments', () => {
    test('should validate generate_pattern arguments', () => {
      const result = InputValidator.validateToolArguments('generate_pattern', {
        style: 'techno',
        key: 'C',
        bpm: 120
      });
      expect(result.valid).toBe(true);
    });

    test('should validate set_tempo arguments', () => {
      const result = InputValidator.validateToolArguments('set_tempo', {
        bpm: 140
      });
      expect(result.valid).toBe(true);
    });

    test('should validate generate_euclidean arguments', () => {
      const result = InputValidator.validateToolArguments('generate_euclidean', {
        hits: 5,
        steps: 8,
        sound: 'bd'
      });
      expect(result.valid).toBe(true);
    });

    test('should fail on invalid BPM in generate_pattern', () => {
      const result = InputValidator.validateToolArguments('generate_pattern', {
        style: 'techno',
        bpm: 500
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('bpm: BPM must be between 20 and 300');
    });

    test('should fail on invalid Euclidean parameters', () => {
      const result = InputValidator.validateToolArguments('generate_euclidean', {
        hits: 10,
        steps: 8,
        sound: 'bd'
      });
      expect(result.valid).toBe(false);
    });
  });
});
```

**Test Cases**: 35+ test cases covering all validation scenarios

#### Phase 1.2: Implement InputValidator (Green)

**File**: `/home/william/git/strudel-mcp-server/src/utils/InputValidator.ts`

```typescript
type ValidationResult<T = any> =
  | { valid: true; value: T }
  | { valid: false; error: string };

type MultiValidationResult =
  | { valid: true; values: Record<string, any> }
  | { valid: false; errors: string[] };

export class InputValidator {
  private static readonly BPM_MIN = 20;
  private static readonly BPM_MAX = 300;
  private static readonly GAIN_MIN = 0;
  private static readonly GAIN_MAX = 2.0;

  private static readonly VALID_SCALES = [
    'major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian',
    'aeolian', 'locrian', 'pentatonic', 'blues', 'chromatic',
    'wholetone', 'harmonic_minor', 'melodic_minor'
  ];

  private static readonly VALID_PROGRESSIONS = [
    'pop', 'jazz', 'blues', 'folk', 'rock', 'classical', 'modal', 'edm'
  ];

  private static readonly VALID_NOTES = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
    'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
  ];

  /**
   * Validates BPM (beats per minute) value
   * @param bpm - Tempo value to validate
   * @returns Validation result with rounded BPM value
   */
  static validateBPM(bpm: number): ValidationResult<number> {
    if (typeof bpm !== 'number' || isNaN(bpm)) {
      return { valid: false, error: 'BPM must be a valid number' };
    }

    const rounded = Math.round(bpm);

    if (rounded < this.BPM_MIN || rounded > this.BPM_MAX) {
      return {
        valid: false,
        error: `BPM must be between ${this.BPM_MIN} and ${this.BPM_MAX}, got ${rounded}`
      };
    }

    return { valid: true, value: rounded };
  }

  /**
   * Validates gain/volume value
   * @param gain - Gain value to validate
   * @returns Validation result
   */
  static validateGain(gain: number): ValidationResult<number> {
    if (typeof gain !== 'number' || isNaN(gain)) {
      return { valid: false, error: 'Gain must be a valid number' };
    }

    if (gain < this.GAIN_MIN || gain > this.GAIN_MAX) {
      return {
        valid: false,
        error: `Gain must be between ${this.GAIN_MIN} and ${this.GAIN_MAX}, got ${gain}`
      };
    }

    return { valid: true, value: gain };
  }

  /**
   * Validates Euclidean rhythm parameters
   * @param hits - Number of hits in the rhythm
   * @param steps - Total number of steps
   * @returns Validation result
   */
  static validateEuclideanParams(hits: number, steps: number): ValidationResult<{ hits: number; steps: number }> {
    if (!Number.isInteger(hits) || !Number.isInteger(steps)) {
      return { valid: false, error: 'Hits and steps must be positive integers' };
    }

    if (hits <= 0 || steps <= 0) {
      return { valid: false, error: 'Hits and steps must be positive integers' };
    }

    if (hits > steps) {
      return {
        valid: false,
        error: `Hits (${hits}) cannot exceed steps (${steps})`
      };
    }

    return { valid: true, hits, steps };
  }

  /**
   * Validates musical scale name
   * @param scaleName - Scale name to validate
   * @returns Validation result with normalized scale name
   */
  static validateScaleName(scaleName: string): ValidationResult<string> {
    const normalized = scaleName.toLowerCase().trim();

    if (!this.VALID_SCALES.includes(normalized)) {
      return {
        valid: false,
        error: `Invalid scale name: ${scaleName}. Valid scales: ${this.VALID_SCALES.join(', ')}`
      };
    }

    return { valid: true, value: normalized };
  }

  /**
   * Validates chord progression style
   * @param style - Progression style to validate
   * @returns Validation result with normalized style
   */
  static validateChordProgressionStyle(style: string): ValidationResult<string> {
    const normalized = style.toLowerCase().trim();

    if (!this.VALID_PROGRESSIONS.includes(normalized)) {
      return {
        valid: false,
        error: `Invalid progression style: ${style}. Valid styles: ${this.VALID_PROGRESSIONS.join(', ')}`
      };
    }

    return { valid: true, value: normalized };
  }

  /**
   * Validates note name
   * @param noteName - Note name to validate
   * @returns Validation result with normalized note name
   */
  static validateNoteName(noteName: string): ValidationResult<string> {
    const normalized = noteName.trim();

    // Check if the note (ignoring octave) is valid
    const noteWithoutOctave = normalized.replace(/\d+$/, '');
    const capitalizedNote = noteWithoutOctave.charAt(0).toUpperCase() + noteWithoutOctave.slice(1);

    if (!this.VALID_NOTES.includes(capitalizedNote)) {
      return {
        valid: false,
        error: `Invalid note name: ${noteName}. Valid notes: ${this.VALID_NOTES.join(', ')}`
      };
    }

    return { valid: true, value: capitalizedNote };
  }

  /**
   * Validates string length
   * @param str - String to validate
   * @param min - Minimum length
   * @param max - Maximum length
   * @returns Validation result
   */
  static validateStringLength(str: string, min: number, max: number): ValidationResult<string> {
    if (str.length < min || str.length > max) {
      return {
        valid: false,
        error: `String length must be between ${min} and ${max} characters, got ${str.length}`
      };
    }

    return { valid: true, value: str };
  }

  /**
   * Validates tool arguments based on tool name
   * @param toolName - Name of the tool
   * @param args - Arguments object to validate
   * @returns Validation result with all errors
   */
  static validateToolArguments(toolName: string, args: Record<string, any>): MultiValidationResult {
    const errors: string[] = [];
    const validated: Record<string, any> = {};

    switch (toolName) {
      case 'generate_pattern':
      case 'set_tempo':
        if (args.bpm !== undefined) {
          const bpmResult = this.validateBPM(args.bpm);
          if (!bpmResult.valid) {
            errors.push(`bpm: ${bpmResult.error}`);
          } else {
            validated.bpm = bpmResult.value;
          }
        }
        break;

      case 'generate_euclidean':
        if (args.hits !== undefined && args.steps !== undefined) {
          const euclideanResult = this.validateEuclideanParams(args.hits, args.steps);
          if (!euclideanResult.valid) {
            errors.push(`euclidean: ${euclideanResult.error}`);
          } else {
            validated.hits = euclideanResult.hits;
            validated.steps = euclideanResult.steps;
          }
        }
        break;

      case 'generate_scale':
        if (args.scale !== undefined) {
          const scaleResult = this.validateScaleName(args.scale);
          if (!scaleResult.valid) {
            errors.push(`scale: ${scaleResult.error}`);
          } else {
            validated.scale = scaleResult.value;
          }
        }
        if (args.root !== undefined) {
          const noteResult = this.validateNoteName(args.root);
          if (!noteResult.valid) {
            errors.push(`root: ${noteResult.error}`);
          } else {
            validated.root = noteResult.value;
          }
        }
        break;

      case 'generate_chord_progression':
        if (args.style !== undefined) {
          const styleResult = this.validateChordProgressionStyle(args.style);
          if (!styleResult.valid) {
            errors.push(`style: ${styleResult.error}`);
          } else {
            validated.style = styleResult.value;
          }
        }
        break;

      case 'add_effect':
        if (args.gain !== undefined) {
          const gainResult = this.validateGain(args.gain);
          if (!gainResult.valid) {
            errors.push(`gain: ${gainResult.error}`);
          } else {
            validated.gain = gainResult.value;
          }
        }
        break;
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, values: validated };
  }
}
```

#### Phase 1.3: Run Tests (Red → Green)

```bash
npm test -- InputValidator.test.ts
```

**Expected**: All 35+ tests pass

#### Phase 1.4: Integrate with EnhancedMCPServerFixed (Refactor)

**File**: `/home/william/git/strudel-mcp-server/src/server/EnhancedMCPServerFixed.ts`

Add validation to `executeTool` method (around line 500):

```typescript
private async executeTool(name: string, args: any): Promise<any> {
  // START: Parameter validation
  const validationResult = InputValidator.validateToolArguments(name, args);
  if (!validationResult.valid) {
    throw new Error(`Invalid parameters: ${validationResult.errors.join(', ')}`);
  }

  // Merge validated values back into args
  if (validationResult.valid) {
    Object.assign(args, validationResult.values);
  }
  // END: Parameter validation

  this.perfMonitor.startOperation(name);

  // ... rest of existing code
}
```

#### Phase 1.5: Add Integration Tests

**File**: `/home/william/git/strudel-mcp-server/src/__tests__/integration/ParameterValidation.integration.test.ts`

```typescript
import { EnhancedMCPServerFixed } from '../../server/EnhancedMCPServerFixed';

describe('Parameter Validation Integration', () => {
  let server: EnhancedMCPServerFixed;

  beforeEach(() => {
    server = new EnhancedMCPServerFixed();
  });

  test('should reject invalid BPM in generate_pattern', async () => {
    const serverAny = server as any;

    await expect(serverAny.executeTool('generate_pattern', {
      style: 'techno',
      bpm: 500
    })).rejects.toThrow('BPM must be between 20 and 300');
  });

  test('should reject invalid Euclidean parameters', async () => {
    const serverAny = server as any;

    await expect(serverAny.executeTool('generate_euclidean', {
      hits: 10,
      steps: 8,
      sound: 'bd'
    })).rejects.toThrow('Hits (10) cannot exceed steps (8)');
  });

  test('should accept valid parameters', async () => {
    const serverAny = server as any;

    const result = await serverAny.executeTool('generate_scale', {
      root: 'C',
      scale: 'major'
    });

    expect(result).toBeTruthy();
  });
});
```

---

## Part 2: Complete Audio Analysis Features (4-5 days)

### Goals
- Implement real BPM/tempo detection using autocorrelation
- Implement key detection using Krumhansl-Schmuckler algorithm
- Implement rhythm pattern analysis with onset detection

### TDD Workflow

#### Phase 2.1: Create Audio Analysis Tests (Red)

**File**: `/home/william/git/strudel-mcp-server/src/__tests__/AudioAnalyzer.test.ts`

```typescript
import { AudioAnalyzer } from '../AudioAnalyzer';
import { Page } from 'playwright';

// Mock audio data generators
const generateSineWave = (frequency: number, sampleRate: number, duration: number): Float32Array => {
  const samples = sampleRate * duration;
  const buffer = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    buffer[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
  return buffer;
};

const generateBeatPattern = (bpm: number, sampleRate: number, duration: number): Float32Array => {
  const samples = sampleRate * duration;
  const buffer = new Float32Array(samples);
  const beatInterval = (60 / bpm) * sampleRate;

  for (let i = 0; i < samples; i++) {
    if (i % beatInterval < 100) {
      buffer[i] = 1.0; // Beat impulse
    }
  }
  return buffer;
};

describe('AudioAnalyzer - Real Analysis', () => {
  let analyzer: AudioAnalyzer;
  let mockPage: any;

  beforeEach(() => {
    analyzer = new AudioAnalyzer();
    mockPage = {
      evaluate: jest.fn()
    };
  });

  describe('detectTempo', () => {
    test('should detect 120 BPM accurately', async () => {
      const audioData = generateBeatPattern(120, 44100, 4);

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.detectTempo(mockPage);

      expect(result.bpm).toBeGreaterThanOrEqual(115);
      expect(result.bpm).toBeLessThanOrEqual(125);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('should detect different BPM values', async () => {
      const testBPMs = [80, 100, 140, 160, 174];

      for (const targetBPM of testBPMs) {
        const audioData = generateBeatPattern(targetBPM, 44100, 4);

        mockPage.evaluate.mockResolvedValue({
          sampleRate: 44100,
          audioBuffer: Array.from(audioData)
        });

        const result = await analyzer.detectTempo(mockPage);
        const tolerance = targetBPM * 0.05; // 5% tolerance

        expect(result.bpm).toBeGreaterThanOrEqual(targetBPM - tolerance);
        expect(result.bpm).toBeLessThanOrEqual(targetBPM + tolerance);
      }
    });

    test('should return low confidence for irregular rhythm', async () => {
      const audioData = new Float32Array(44100 * 4); // 4 seconds of noise
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.random() * 0.5 - 0.25;
      }

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.detectTempo(mockPage);

      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should handle silent audio', async () => {
      const audioData = new Float32Array(44100 * 4);

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.detectTempo(mockPage);

      expect(result.bpm).toBe(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('detectKey', () => {
    test('should detect C major key', async () => {
      // Generate C major scale frequencies
      const cMajorFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
      const audioData = new Float32Array(44100 * 2);

      // Mix all frequencies
      cMajorFrequencies.forEach(freq => {
        const wave = generateSineWave(freq, 44100, 2);
        for (let i = 0; i < audioData.length; i++) {
          audioData[i] += wave[i] / cMajorFrequencies.length;
        }
      });

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData),
        fftData: [] // Would include FFT analysis
      });

      const result = await analyzer.detectKey(mockPage);

      expect(result.key).toBe('C');
      expect(result.scale).toBe('major');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('should detect A minor key', async () => {
      // A minor: A, B, C, D, E, F, G
      const aMinorFrequencies = [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00];
      const audioData = new Float32Array(44100 * 2);

      aMinorFrequencies.forEach(freq => {
        const wave = generateSineWave(freq, 44100, 2);
        for (let i = 0; i < audioData.length; i++) {
          audioData[i] += wave[i] / aMinorFrequencies.length;
        }
      });

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.detectKey(mockPage);

      expect(['A', 'Am', 'A minor']).toContain(result.key);
      expect(['minor', 'aeolian']).toContain(result.scale);
    });

    test('should return unknown for atonal content', async () => {
      const audioData = new Float32Array(44100 * 2);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.random() * 2 - 1;
      }

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.detectKey(mockPage);

      expect(result.confidence).toBeLessThan(0.4);
    });
  });

  describe('analyzeRhythm', () => {
    test('should detect onset events', async () => {
      const audioData = generateBeatPattern(120, 44100, 4);

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.analyzeRhythm(mockPage);

      expect(result.onsets).toBeDefined();
      expect(result.onsets.length).toBeGreaterThan(0);
      expect(result.onsets.length).toBeLessThanOrEqual(8); // 120 BPM over 4 seconds
    });

    test('should calculate rhythm complexity', async () => {
      const regularBeat = generateBeatPattern(120, 44100, 4);

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(regularBeat)
      });

      const result = await analyzer.analyzeRhythm(mockPage);

      expect(result.complexity).toBeDefined();
      expect(result.complexity).toBeGreaterThanOrEqual(0);
      expect(result.complexity).toBeLessThanOrEqual(1);
    });

    test('should identify rhythm patterns', async () => {
      const audioData = generateBeatPattern(120, 44100, 4);

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.analyzeRhythm(mockPage);

      expect(result.pattern).toBeDefined();
      expect(['regular', 'syncopated', 'polyrhythmic', 'irregular']).toContain(result.pattern);
    });

    test('should handle silent audio', async () => {
      const audioData = new Float32Array(44100 * 4);

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.analyzeRhythm(mockPage);

      expect(result.onsets.length).toBe(0);
      expect(result.complexity).toBe(0);
    });
  });

  describe('getCompleteAnalysis', () => {
    test('should combine all analysis features', async () => {
      const audioData = generateBeatPattern(120, 44100, 4);

      mockPage.evaluate.mockResolvedValue({
        sampleRate: 44100,
        audioBuffer: Array.from(audioData)
      });

      const result = await analyzer.getCompleteAnalysis(mockPage);

      expect(result.tempo).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.rhythm).toBeDefined();
      expect(result.spectrum).toBeDefined();
    });
  });
});
```

**Test Cases**: 25+ test cases for tempo, key, and rhythm analysis

#### Phase 2.2: Implement Real Audio Analysis Algorithms (Green)

**File**: `/home/william/git/strudel-mcp-server/src/AudioAnalyzer.ts`

Add these methods to the existing AudioAnalyzer class:

```typescript
/**
 * Autocorrelation-based tempo detection
 * @param page - Playwright page with audio context
 * @returns Detected BPM and confidence level
 */
async detectTempo(page: Page): Promise<{ bpm: number; confidence: number }> {
  const result = await page.evaluate(() => {
    const analyzer = (window as any).strudelAudioAnalyzer;
    if (!analyzer || !analyzer.isConnected) {
      return { bpm: 0, confidence: 0 };
    }

    // Get audio buffer from analyzer
    const bufferLength = analyzer.analyser.fftSize;
    const timeData = new Float32Array(bufferLength);
    analyzer.analyser.getFloatTimeDomainData(timeData);

    // Energy-based onset detection
    const onsets: number[] = [];
    const frameSize = 512;
    const hopSize = 256;

    for (let i = 0; i < timeData.length - frameSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < frameSize; j++) {
        energy += timeData[i + j] * timeData[i + j];
      }

      // Detect onset if energy exceeds threshold
      if (energy > 0.01) {
        onsets.push(i / analyzer.analyser.context.sampleRate);
      }
    }

    if (onsets.length < 2) {
      return { bpm: 0, confidence: 0 };
    }

    // Calculate intervals between onsets
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }

    // Find most common interval (mode)
    const intervalCounts: { [key: number]: number } = {};
    intervals.forEach(interval => {
      const rounded = Math.round(interval * 100) / 100;
      intervalCounts[rounded] = (intervalCounts[rounded] || 0) + 1;
    });

    let maxCount = 0;
    let modeInterval = 0;
    Object.entries(intervalCounts).forEach(([interval, count]) => {
      if (count > maxCount) {
        maxCount = count;
        modeInterval = parseFloat(interval);
      }
    });

    if (modeInterval === 0) {
      return { bpm: 0, confidence: 0 };
    }

    // Convert interval to BPM
    const bpm = Math.round(60 / modeInterval);
    const confidence = maxCount / intervals.length;

    // Clamp BPM to reasonable range
    const clampedBPM = Math.max(60, Math.min(200, bpm));

    return { bpm: clampedBPM, confidence };
  });

  return result;
}

/**
 * Krumhansl-Schmuckler key detection algorithm
 * @param page - Playwright page with audio context
 * @returns Detected musical key and confidence
 */
async detectKey(page: Page): Promise<{ key: string; scale: string; confidence: number }> {
  const result = await page.evaluate(() => {
    const analyzer = (window as any).strudelAudioAnalyzer;
    if (!analyzer || !analyzer.isConnected) {
      return { key: 'unknown', scale: 'unknown', confidence: 0 };
    }

    // Krumhansl-Schmuckler major and minor profiles
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    // Get frequency data
    const frequencyData = new Uint8Array(analyzer.analyser.frequencyBinCount);
    analyzer.analyser.getByteFrequencyData(frequencyData);

    // Build pitch class profile (12-tone chromatic)
    const pitchClasses = new Array(12).fill(0);

    // Map FFT bins to pitch classes
    const sampleRate = analyzer.analyser.context.sampleRate;
    const binFreq = sampleRate / analyzer.analyser.fftSize;

    frequencyData.forEach((magnitude, bin) => {
      const frequency = bin * binFreq;

      // Skip DC and very low frequencies
      if (frequency < 27.5) return;

      // Convert frequency to pitch class (0-11)
      const pitchClass = Math.round(12 * Math.log2(frequency / 440) + 9) % 12;
      if (pitchClass >= 0 && pitchClass < 12) {
        pitchClasses[pitchClass] += magnitude;
      }
    });

    // Normalize pitch class profile
    const sum = pitchClasses.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      return { key: 'unknown', scale: 'unknown', confidence: 0 };
    }

    const normalized = pitchClasses.map(pc => pc / sum);

    // Correlate with each key
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let maxCorr = -Infinity;
    let detectedKey = 'C';
    let detectedScale = 'major';

    // Check all 24 keys (12 major + 12 minor)
    for (let tonic = 0; tonic < 12; tonic++) {
      // Major key correlation
      let majorCorr = 0;
      for (let pc = 0; pc < 12; pc++) {
        majorCorr += normalized[(pc + tonic) % 12] * majorProfile[pc];
      }

      if (majorCorr > maxCorr) {
        maxCorr = majorCorr;
        detectedKey = noteNames[tonic];
        detectedScale = 'major';
      }

      // Minor key correlation
      let minorCorr = 0;
      for (let pc = 0; pc < 12; pc++) {
        minorCorr += normalized[(pc + tonic) % 12] * minorProfile[pc];
      }

      if (minorCorr > maxCorr) {
        maxCorr = minorCorr;
        detectedKey = noteNames[tonic];
        detectedScale = 'minor';
      }
    }

    // Normalize confidence to 0-1
    const confidence = Math.min(1, maxCorr / 10);

    return { key: detectedKey, scale: detectedScale, confidence };
  });

  return result;
}

/**
 * Analyzes rhythm patterns using onset detection
 * @param page - Playwright page with audio context
 * @returns Rhythm analysis including onsets and complexity
 */
async analyzeRhythm(page: Page): Promise<{
  onsets: number[];
  complexity: number;
  pattern: string;
}> {
  const result = await page.evaluate(() => {
    const analyzer = (window as any).strudelAudioAnalyzer;
    if (!analyzer || !analyzer.isConnected) {
      return { onsets: [], complexity: 0, pattern: 'unknown' };
    }

    // Spectral flux onset detection
    const bufferLength = analyzer.analyser.frequencyBinCount;
    const numFrames = 100;
    const prevSpectrum = new Uint8Array(bufferLength);
    const onsets: number[] = [];

    analyzer.analyser.getByteFrequencyData(prevSpectrum);

    for (let frame = 0; frame < numFrames; frame++) {
      const currentSpectrum = new Uint8Array(bufferLength);
      analyzer.analyser.getByteFrequencyData(currentSpectrum);

      // Calculate spectral flux
      let flux = 0;
      for (let i = 0; i < bufferLength; i++) {
        const diff = currentSpectrum[i] - prevSpectrum[i];
        if (diff > 0) {
          flux += diff;
        }
      }

      // Onset if flux exceeds threshold
      if (flux > 50) {
        const timeStamp = frame * 0.05; // Assuming 50ms frames
        onsets.push(timeStamp);
      }

      prevSpectrum.set(currentSpectrum);
    }

    // Calculate rhythm complexity
    let complexity = 0;
    if (onsets.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < onsets.length; i++) {
        intervals.push(onsets[i] - onsets[i - 1]);
      }

      // Standard deviation of intervals indicates complexity
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      complexity = Math.min(1, stdDev / mean);
    }

    // Classify rhythm pattern
    let pattern = 'regular';
    if (complexity > 0.5) {
      pattern = 'irregular';
    } else if (complexity > 0.3) {
      pattern = 'syncopated';
    } else if (onsets.length === 0) {
      pattern = 'silent';
    }

    return { onsets, complexity, pattern };
  });

  return result;
}

/**
 * Complete audio analysis combining all features
 * @param page - Playwright page with audio context
 * @returns Complete analysis object
 */
async getCompleteAnalysis(page: Page): Promise<{
  tempo: { bpm: number; confidence: number };
  key: { key: string; scale: string; confidence: number };
  rhythm: { onsets: number[]; complexity: number; pattern: string };
  spectrum: any;
}> {
  const [tempo, key, rhythm, spectrum] = await Promise.all([
    this.detectTempo(page),
    this.detectKey(page),
    this.analyzeRhythm(page),
    this.getAnalysis(page) // Existing spectrum analysis
  ]);

  return { tempo, key, rhythm, spectrum };
}
```

#### Phase 2.3: Update Server Integration

**File**: `/home/william/git/strudel-mcp-server/src/server/EnhancedMCPServerFixed.ts`

Replace mock implementations around line 747:

```typescript
case 'detect_tempo':
  const tempoResult = await this.controller.getAudioAnalysis();
  if (tempoResult.error) {
    return `Tempo detection error: ${tempoResult.error}`;
  }

  // Use real tempo detection
  const tempoAnalysis = await this.controller.page.evaluate(async () => {
    const analyzer = new (window as any).AudioAnalyzer();
    return await analyzer.detectTempo(page);
  });

  return `Detected tempo: ${tempoAnalysis.bpm} BPM (confidence: ${(tempoAnalysis.confidence * 100).toFixed(1)}%)`;

case 'detect_key':
  const keyAnalysis = await this.controller.page.evaluate(async () => {
    const analyzer = new (window as any).AudioAnalyzer();
    return await analyzer.detectKey(page);
  });

  return `Detected key: ${keyAnalysis.key} ${keyAnalysis.scale} (confidence: ${(keyAnalysis.confidence * 100).toFixed(1)}%)`;

case 'analyze_rhythm':
  const rhythmAnalysis = await this.controller.page.evaluate(async () => {
    const analyzer = new (window as any).AudioAnalyzer();
    return await analyzer.analyzeRhythm(page);
  });

  return JSON.stringify({
    onsets: rhythmAnalysis.onsets.length,
    complexity: rhythmAnalysis.complexity.toFixed(2),
    pattern: rhythmAnalysis.pattern
  }, null, 2);

case 'analyze':
  const completeAnalysis = await this.controller.page.evaluate(async () => {
    const analyzer = new (window as any).AudioAnalyzer();
    return await analyzer.getCompleteAnalysis(page);
  });

  return JSON.stringify(completeAnalysis, null, 2);
```

---

## Part 3: Fix Jest ES Module Import Issue (1 day)

### Goals
- Fix MCP SDK ES module import in Jest
- Ensure all tests pass including integration tests

### TDD Workflow

#### Phase 3.1: Update Jest Configuration (Green)

**File**: `/home/william/git/strudel-mcp-server/jest.config.js`

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true
      }
    }],
  },
  // FIX: Transform MCP SDK ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/__tests__/**/*',
    '!src/**/__mocks__/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  // FIX: Typo in coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // FIX: Map MCP SDK imports
    '^@modelcontextprotocol/sdk/(.*)$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/$1'
  },
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 10000,
  verbose: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverage: true,
  maxWorkers: '50%'
};
```

#### Phase 3.2: Run All Tests

```bash
npm test
```

**Expected**: All tests pass including integration tests

---

## Implementation Timeline

### Week 1: Days 1-5

**Day 1-2: Parameter Validation**
- Morning: Write InputValidator tests (Phase 1.1)
- Afternoon: Implement InputValidator (Phase 1.2)
- Verify: All validation tests pass

**Day 3: Parameter Validation Integration**
- Morning: Integrate with EnhancedMCPServerFixed (Phase 1.4)
- Afternoon: Write integration tests (Phase 1.5)
- Verify: Server rejects invalid parameters

**Day 4-5: Audio Analysis - Tempo Detection**
- Morning: Write tempo detection tests (Phase 2.1)
- Afternoon: Implement autocorrelation algorithm (Phase 2.2)
- Verify: Tempo detection accuracy within 5% tolerance

### Week 2: Days 6-10

**Day 6-7: Audio Analysis - Key Detection**
- Morning: Write key detection tests
- Afternoon: Implement Krumhansl-Schmuckler algorithm
- Verify: Key detection accuracy > 70%

**Day 8: Audio Analysis - Rhythm Analysis**
- Morning: Write rhythm analysis tests
- Afternoon: Implement onset detection
- Verify: Onset detection functional

**Day 9: Audio Analysis Integration**
- Morning: Update server integration (Phase 2.3)
- Afternoon: End-to-end testing
- Verify: All analysis features accessible via MCP

**Day 10: Jest Configuration & Final Testing**
- Morning: Fix Jest ES module issue (Phase 3)
- Afternoon: Run full test suite
- Verify: All 170+ tests pass

---

## Test Coverage Goals

### Current Coverage (Baseline)
- Statements: 37.08%
- Branches: 24.61%
- Functions: 47.43%
- Lines: 37.58%

### Target Coverage (v2.3.0)
- Statements: 80% (+42.92%)
- Branches: 70% (+45.39%)
- Functions: 75% (+27.57%)
- Lines: 80% (+42.42%)

### Coverage by Module

**InputValidator.ts**: 100% (new file)
**AudioAnalyzer.ts**: 80% (currently 13.58%)
**EnhancedMCPServerFixed.ts**: 60% (currently 0%)

---

## Backward Compatibility

### No Breaking Changes
- All new validation is additive
- Existing valid parameters continue to work
- Invalid parameters that previously failed silently now throw clear errors

### Migration Path
- Users with invalid parameters will get helpful error messages
- Error messages include valid ranges and options
- No code changes required for valid usage

---

## Success Criteria

### Functional Requirements
- [ ] All parameter validation tests pass
- [ ] Tempo detection accuracy >= 95% for regular beats
- [ ] Key detection accuracy >= 70% for tonal music
- [ ] Rhythm analysis detects onsets correctly
- [ ] Jest integration test suite passes

### Quality Requirements
- [ ] Test coverage >= 80% for new code
- [ ] All edge cases covered
- [ ] Clear error messages for validation failures
- [ ] Performance: validation adds < 1ms overhead

### Documentation Requirements
- [ ] JSDoc comments for all public methods
- [ ] Test cases document expected behavior
- [ ] README updated with validation examples

---

## Risk Mitigation

### Technical Risks

**Risk**: Audio analysis algorithms may not work in browser environment
**Mitigation**: Use Web Audio API compatible implementations, test with real Strudel.cc

**Risk**: Jest ES module configuration may break other tests
**Mitigation**: Incremental testing, separate integration tests if needed

**Risk**: Parameter validation may reject valid edge cases
**Mitigation**: Comprehensive test cases, tolerance ranges for numeric values

### Timeline Risks

**Risk**: Audio analysis algorithms more complex than estimated
**Mitigation**: Start with simpler autocorrelation, iterate if time allows

**Risk**: Jest configuration issues take longer to resolve
**Mitigation**: Deprioritize if needed, can be addressed in v2.3.1

---

## Post-Implementation Tasks

1. **Update Documentation**
   - Add validation examples to README
   - Document audio analysis features
   - Update CHANGELOG.md

2. **Performance Testing**
   - Benchmark validation overhead
   - Measure audio analysis performance
   - Optimize if needed

3. **User Feedback**
   - Monitor error reports
   - Collect accuracy feedback on audio analysis
   - Iterate based on real-world usage

---

## Appendix: Test File Structure

```
src/__tests__/
├── InputValidator.test.ts          # 35+ tests
├── AudioAnalyzer.test.ts           # 25+ tests
├── integration/
│   ├── MCPServer.integration.test.ts    # Updated
│   └── ParameterValidation.integration.test.ts  # New
└── utils/
    └── AudioTestFixtures.ts        # Helper functions
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-23
**Author**: ARCHITECT Agent
**Status**: Ready for Implementation
