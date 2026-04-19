/**
 * playback domain — transport controls (play, pause, stop).
 *
 * Owns (3 tools): play, pause, stop. Post-consolidation target
 * (#110 audit, #120 epic): single `playback` tool with action enum.
 * For now we keep the individual verbs and only extract them out of
 * server.ts.
 *
 * Initialization checks happen upstream via requiresInitialization()
 * in StrudelMCPServer — handlers here assume the browser is ready.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext, ToolModule } from './types.js';

export const tools: Tool[] = [
  {
    name: 'play',
    description: 'Start playing pattern',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'pause',
    description: 'Pause playback',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'stop',
    description: 'Stop playback',
    inputSchema: { type: 'object', properties: {} },
  },
];

export const toolNames = new Set(tools.map(t => t.name));

export async function execute(name: string, _args: any, ctx: ToolContext): Promise<unknown> {
  switch (name) {
    case 'play':
      return await ctx.controller.play();

    case 'pause':
    case 'stop':
      return await ctx.controller.stop();

    default:
      throw new Error(`playback module does not handle tool: ${name}`);
  }
}

export const playbackModule: ToolModule = { tools, toolNames, execute };
