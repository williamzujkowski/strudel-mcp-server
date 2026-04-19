/**
 * Shared types for the per-domain tool modules under src/server/tools/.
 *
 * Part of the file-split work tracked in #104. Each domain file exports a
 * `tools` array of MCP tool definitions and an `execute(name, args, ctx)`
 * dispatcher. The server keeps the MCP protocol layer thin and delegates
 * to these modules.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { StrudelController } from '../../StrudelController.js';
import type { PerformanceMonitor } from '../../utils/PerformanceMonitor.js';

/**
 * Runtime context passed into every tool executor. Getters rather than
 * values so that mutable server state (isInitialized flag) stays live.
 */
export interface ToolContext {
  controller: StrudelController;
  perfMonitor: PerformanceMonitor;
  isInitialized(): boolean;
}

/**
 * Shape every domain module exports.
 */
export interface ToolModule {
  /** MCP tool definitions for this domain. */
  tools: Tool[];
  /** Names of tools this module handles — used by the dispatcher. */
  toolNames: Set<string>;
  /** Execute a tool by name. Throws if the name is unknown to this module. */
  execute(name: string, args: any, ctx: ToolContext): Promise<unknown>;
}
