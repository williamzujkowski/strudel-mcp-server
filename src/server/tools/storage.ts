/**
 * storage domain — pattern persistence (save, load, list).
 *
 * Owns (3 tools): save, load, list. Post-consolidation target per the
 * #110 audit: single `pattern_store` tool with `action` enum + params,
 * which also resolves the `list` / `list_sessions` naming collision.
 * For now we keep the individual verbs.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext, ToolModule } from './types.js';
import { InputValidator } from '../../utils/InputValidator.js';

export const tools: Tool[] = [
  {
    name: 'save',
    description: 'Save pattern with metadata',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pattern name' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['name'],
    },
  },
  {
    name: 'load',
    description: 'Load saved pattern',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Pattern name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list',
    description: 'List saved patterns',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Filter by tag' },
      },
    },
  },
];

export const toolNames = new Set(tools.map(t => t.name));

export async function execute(name: string, args: any, ctx: ToolContext): Promise<unknown> {
  switch (name) {
    case 'save': {
      InputValidator.validateStringLength(args.name, 'name', 255, false);
      const toSave = await ctx.getCurrentPatternSafe();
      if (!toSave) {
        return 'No pattern to save';
      }
      await ctx.store.save(args.name, toSave, args.tags || []);
      return `Pattern saved as "${args.name}"`;
    }

    case 'load': {
      InputValidator.validateStringLength(args.name, 'name', 255, false);
      const saved = await ctx.store.load(args.name);
      if (saved) {
        await ctx.writePatternSafe(saved.content);
        return `Loaded pattern "${args.name}"`;
      }
      return `Pattern "${args.name}" not found`;
    }

    case 'list': {
      if (args?.tag) {
        InputValidator.validateStringLength(args.tag, 'tag', 100, false);
      }
      const patterns = await ctx.store.list(args?.tag);
      return patterns.map(p =>
        `• ${p.name} [${p.tags.join(', ')}] - ${p.timestamp}`
      ).join('\n') || 'No patterns found';
    }

    default:
      throw new Error(`storage module does not handle tool: ${name}`);
  }
}

export const storageModule: ToolModule = { tools, toolNames, execute };
