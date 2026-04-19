/**
 * analysis domain — audio analysis + pattern runtime validation.
 *
 * Owns (6 tools): analyze, analyze_spectrum, analyze_rhythm,
 * detect_tempo, detect_key, validate_pattern_runtime.
 *
 * Post-consolidation (per #110 audit): a single `analyze` tool with
 * an `include[]` filter absorbs the 4 detection-specific tools.
 * `validate_pattern_runtime` stays separate — it's console/syntax
 * scraping, not audio DSP.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext, ToolModule } from './types.js';
import { InputValidator } from '../../utils/InputValidator.js';

export const tools: Tool[] = [
  {
    name: 'analyze',
    description: 'Complete audio analysis',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'analyze_spectrum',
    description: 'FFT spectrum analysis',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'analyze_rhythm',
    description: 'Rhythm analysis',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'detect_tempo',
    description: 'BPM detection',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'detect_key',
    description: 'Key detection',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'validate_pattern_runtime',
    description: 'Validate pattern with runtime error checking (monitors Strudel console for errors)',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Pattern code to validate' },
        waitMs: { type: 'number', description: 'How long to wait for errors (default 500ms)' },
      },
      required: ['pattern'],
    },
  },
];

export const toolNames = new Set(tools.map(t => t.name));

export async function execute(name: string, args: any, ctx: ToolContext): Promise<unknown> {
  if (!ctx.isInitialized()) {
    return 'Browser not initialized. Run init first.';
  }

  switch (name) {
    case 'analyze':
      return await ctx.controller.analyzeAudio();

    case 'analyze_spectrum': {
      const spectrum = await ctx.controller.analyzeAudio();
      return spectrum.features || spectrum;
    }

    case 'analyze_rhythm':
      return await ctx.controller.analyzeRhythm();

    case 'detect_tempo': {
      try {
        const tempoAnalysis = await ctx.controller.detectTempo();
        if (!tempoAnalysis || tempoAnalysis.bpm === 0) {
          return {
            bpm: 0,
            confidence: 0,
            message: 'No tempo detected. Ensure audio is playing and has a clear rhythmic pattern.',
          };
        }
        return {
          bpm: tempoAnalysis.bpm,
          confidence: Math.round(tempoAnalysis.confidence * 100) / 100,
          method: tempoAnalysis.method,
          message: `Detected ${tempoAnalysis.bpm} BPM with ${Math.round(tempoAnalysis.confidence * 100)}% confidence`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { bpm: 0, confidence: 0, error: message || 'Tempo detection failed' };
      }
    }

    case 'detect_key': {
      try {
        const keyAnalysis = await ctx.controller.detectKey();
        if (!keyAnalysis || keyAnalysis.confidence < 0.1) {
          return {
            key: 'Unknown',
            scale: 'unknown',
            confidence: 0,
            message: 'No clear key detected. Ensure audio is playing and has tonal content.',
          };
        }
        const result: any = {
          key: keyAnalysis.key,
          scale: keyAnalysis.scale,
          confidence: Math.round(keyAnalysis.confidence * 100) / 100,
          message: `Detected ${keyAnalysis.key} ${keyAnalysis.scale} with ${Math.round(keyAnalysis.confidence * 100)}% confidence`,
        };
        if (keyAnalysis.alternatives && keyAnalysis.alternatives.length > 0) {
          result.alternatives = keyAnalysis.alternatives.map((alt: any) => ({
            key: alt.key,
            scale: alt.scale,
            confidence: Math.round(alt.confidence * 100) / 100,
          }));
        }
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { key: 'Unknown', scale: 'unknown', confidence: 0, error: message || 'Key detection failed' };
      }
    }

    case 'validate_pattern_runtime': {
      InputValidator.validateStringLength(args.pattern, 'pattern', 10000, false);
      const validation = await ctx.controller.validatePatternRuntime(
        args.pattern,
        args.waitMs || 500,
      );
      if (validation.valid) {
        return '✅ Pattern valid - no runtime errors detected';
      }
      return `❌ Pattern has runtime errors:\n${validation.errors.join('\n')}\n` +
        (validation.warnings.length > 0 ? `\nWarnings:\n${validation.warnings.join('\n')}` : '');
    }

    default:
      throw new Error(`analysis module does not handle tool: ${name}`);
  }
}

export const analysisModule: ToolModule = { tools, toolNames, execute };
