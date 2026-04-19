/**
 * editor domain — pattern editing in the CodeMirror editor.
 *
 * Owns (6 tools): write, append, insert, replace, clear, get_pattern.
 * Post-consolidation per the #110 audit: the five mutating tools
 * collapse into an `edit_pattern` tool with a `mode` enum, while
 * `get_pattern` stays separate (hot read path).
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext, ToolModule } from './types.js';
import { InputValidator } from '../../utils/InputValidator.js';

export const tools: Tool[] = [
  {
    name: 'write',
    description: 'Write pattern to editor with optional auto-play and validation',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Pattern code' },
        auto_play: { type: 'boolean', description: 'Start playback immediately after writing (default: false)' },
        validate: { type: 'boolean', description: 'Validate pattern before writing (default: true)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'append',
    description: 'Append code to current pattern',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'Code to append' } },
      required: ['code'],
    },
  },
  {
    name: 'insert',
    description: 'Insert code at specific line',
    inputSchema: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Line number' },
        code: { type: 'string', description: 'Code to insert' },
      },
      required: ['position', 'code'],
    },
  },
  {
    name: 'replace',
    description: 'Replace pattern section',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Text to replace' },
        replace: { type: 'string', description: 'Replacement text' },
      },
      required: ['search', 'replace'],
    },
  },
  {
    name: 'clear',
    description: 'Clear the editor',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_pattern',
    description: 'Get current pattern code',
    inputSchema: { type: 'object', properties: {} },
  },
];

export const toolNames = new Set(tools.map(t => t.name));

export async function execute(name: string, args: any, ctx: ToolContext): Promise<unknown> {
  switch (name) {
    case 'write': {
      InputValidator.validateStringLength(args.pattern, 'pattern', 10000, true);

      // Validate pattern if requested (default: true) — issue #40
      if (args.validate !== false && ctx.isInitialized() && typeof ctx.controller.validatePattern === 'function') {
        try {
          const validation = await ctx.controller.validatePattern(args.pattern);
          if (validation && !validation.valid) {
            return {
              success: false,
              errors: validation.errors,
              warnings: validation.warnings,
              suggestions: validation.suggestions,
              message: `Pattern validation failed: ${validation.errors.join('; ')}`,
            };
          }
        } catch {
          ctx.logger.warn('Pattern validation threw error, continuing with write');
        }
      }

      const writeResult = await ctx.writePatternSafe(args.pattern);

      // Auto-play if requested — issue #38
      if (args.auto_play && ctx.isInitialized()) {
        await ctx.controller.play();
        return `${writeResult}. Playing.`;
      }
      return writeResult;
    }

    case 'append': {
      InputValidator.validateStringLength(args.code, 'code', 10000, true);
      const current = await ctx.getCurrentPatternSafe();
      return await ctx.writePatternSafe(current + '\n' + args.code);
    }

    case 'insert': {
      InputValidator.validatePositiveInteger(args.position, 'position');
      InputValidator.validateStringLength(args.code, 'code', 10000, true);
      const lines = (await ctx.getCurrentPatternSafe()).split('\n');
      lines.splice(args.position, 0, args.code);
      return await ctx.writePatternSafe(lines.join('\n'));
    }

    case 'replace': {
      InputValidator.validateStringLength(args.search, 'search', 1000, true);
      InputValidator.validateStringLength(args.replace, 'replace', 10000, true);
      const pattern = await ctx.getCurrentPatternSafe();
      // Escape $ in replacement to prevent special sequence injection ($&, $1, $', etc.)
      const safeReplacement = args.replace.replace(/\$/g, '$$$$');
      const replaced = pattern.replace(args.search, safeReplacement);
      return await ctx.writePatternSafe(replaced);
    }

    case 'clear':
      return await ctx.writePatternSafe('');

    case 'get_pattern':
      return await ctx.getCurrentPatternSafe();

    default:
      throw new Error(`editor module does not handle tool: ${name}`);
  }
}

export const editorModule: ToolModule = { tools, toolNames, execute };
