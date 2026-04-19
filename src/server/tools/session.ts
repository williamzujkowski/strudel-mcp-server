/**
 * session domain — multi-session lifecycle management.
 *
 * Owns (4 tools): create_session, destroy_session, list_sessions,
 * switch_session. Per the #110 audit, these collapse into a single
 * `session` tool with an `action` enum post-split. `init` stays
 * separate — it's the global bootstrap, not a session operation.
 *
 * `show_browser` also stays in server.ts for now until it moves into
 * a `browser_window` module (per audit) alongside `screenshot`.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext, ToolModule } from './types.js';
import { InputValidator } from '../../utils/InputValidator.js';

export const tools: Tool[] = [
  {
    name: 'create_session',
    description: 'Create a new isolated Strudel browser session. Sessions share one browser but have isolated contexts.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string', description: 'Unique identifier for the session' } },
      required: ['session_id'],
    },
  },
  {
    name: 'destroy_session',
    description: 'Close and destroy a Strudel session, releasing its resources.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string', description: 'Session identifier to destroy' } },
      required: ['session_id'],
    },
  },
  {
    name: 'list_sessions',
    description: 'List all active Strudel sessions with their metadata.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'switch_session',
    description: 'Change the default session used by other tools.',
    inputSchema: {
      type: 'object',
      properties: { session_id: { type: 'string', description: 'Session identifier to set as default' } },
      required: ['session_id'],
    },
  },
];

export const toolNames = new Set(tools.map(t => t.name));

export async function execute(name: string, args: any, ctx: ToolContext): Promise<unknown> {
  const sm = ctx.sessionManager;

  switch (name) {
    case 'create_session': {
      InputValidator.validateStringLength(args.session_id, 'session_id', 100, false);
      try {
        await sm.createSession(args.session_id);
        return {
          success: true,
          session_id: args.session_id,
          message: `Session '${args.session_id}' created successfully`,
          total_sessions: sm.getSessionCount(),
          max_sessions: sm.getMaxSessions(),
        };
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }

    case 'destroy_session': {
      InputValidator.validateStringLength(args.session_id, 'session_id', 100, false);
      try {
        await sm.destroySession(args.session_id);
        return {
          success: true,
          session_id: args.session_id,
          message: `Session '${args.session_id}' destroyed`,
          remaining_sessions: sm.getSessionCount(),
        };
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }

    case 'list_sessions': {
      const info = sm.getSessionsInfo();
      return {
        count: info.length,
        max_sessions: sm.getMaxSessions(),
        default_session: sm.getDefaultSessionId(),
        sessions: info.map(s => ({
          id: s.id,
          created: s.created.toISOString(),
          last_activity: s.lastActivity.toISOString(),
          is_playing: s.isPlaying,
          is_default: s.id === sm.getDefaultSessionId(),
        })),
      };
    }

    case 'switch_session': {
      InputValidator.validateStringLength(args.session_id, 'session_id', 100, false);
      try {
        sm.setDefaultSession(args.session_id);
        return {
          success: true,
          default_session: args.session_id,
          message: `Default session switched to '${args.session_id}'`,
        };
      } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    }

    default:
      throw new Error(`session module does not handle tool: ${name}`);
  }
}

export const sessionModule: ToolModule = { tools, toolNames, execute };
