#!/usr/bin/env npx tsx
/**
 * Tool Documentation Generator
 *
 * Extracts tool names and descriptions from the MCP server source
 * and injects them into README.md between markers.
 *
 * Usage:
 *   npx tsx scripts/generate-tool-docs.ts          # inject into README.md
 *   npx tsx scripts/generate-tool-docs.ts check     # verify README is current
 */

/* eslint-disable no-console */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SERVER_PATH = join(ROOT, 'src/server/EnhancedMCPServerFixed.ts');
const README_PATH = join(ROOT, 'README.md');

const START_MARKER = '<!-- TOOLS:START -->';
const END_MARKER = '<!-- TOOLS:END -->';

interface Tool {
  name: string;
  description: string;
}

function extractTools(): Tool[] {
  const content = readFileSync(SERVER_PATH, 'utf-8');
  const tools: Tool[] = [];

  // Match tool definitions: { name: 'tool_name', description: 'desc' }
  const regex = /name:\s*'([^']+)',\s*\n\s*description:\s*'([^']+)'/g;
  for (const match of content.matchAll(regex)) {
    const name = match[1] ?? '';
    const desc = match[2] ?? '';
    if (name !== '' && name !== 'strudel-mcp-enhanced') {
      tools.push({ name, description: desc });
    }
  }

  return tools;
}

function categorizeTools(tools: Tool[]): Map<string, Tool[]> {
  const categories = new Map<string, Tool[]>();

  const categoryMap: Record<string, string> = {
    init: 'Setup', write: 'Pattern Editing', append: 'Pattern Editing',
    insert: 'Pattern Editing', replace: 'Pattern Editing', get_pattern: 'Pattern Editing',
    play: 'Playback', pause: 'Playback', stop: 'Playback', clear: 'Playback',
    set_tempo: 'Playback', status: 'Playback',
    save: 'Storage', load: 'Storage', list: 'Storage',
    undo: 'History', redo: 'History', list_history: 'History', restore_history: 'History',
    analyze: 'Analysis', analyze_spectrum: 'Analysis', analyze_rhythm: 'Analysis',
    detect_tempo: 'Analysis', detect_key: 'Analysis', compare_patterns: 'Analysis',
    validate_pattern_runtime: 'Analysis',
    generate_scale: 'Music Theory', generate_chord_progression: 'Music Theory',
    generate_euclidean: 'Music Theory', apply_scale: 'Music Theory',
    generate_melody: 'Generation', generate_bassline: 'Generation',
    generate_drums: 'Generation', generate_fill: 'Generation',
    generate_pattern: 'Generation', generate_polyrhythm: 'Generation',
    generate_variation: 'Generation', compose: 'Generation',
    transpose: 'Transform', reverse: 'Transform', stretch: 'Transform',
    quantize: 'Transform', humanize: 'Transform', add_effect: 'Transform',
    remove_effect: 'Transform', add_swing: 'Transform', set_energy: 'Transform',
    get_pattern_feedback: 'AI', refine: 'AI', jam_with: 'AI', shift_mood: 'AI',
    create_session: 'Session', destroy_session: 'Session',
    list_sessions: 'Session', switch_session: 'Session',
    export_midi: 'Export', screenshot: 'Export',
    start_audio_capture: 'Audio', capture_audio_sample: 'Audio',
    stop_audio_capture: 'Audio',
    show_browser: 'Debug', show_errors: 'Debug', diagnostics: 'Debug',
    memory_usage: 'Debug', performance_report: 'Debug',
  };

  for (const tool of tools) {
    const category = categoryMap[tool.name] ?? 'Other';
    const existing = categories.get(category) ?? [];
    existing.push(tool);
    categories.set(category, existing);
  }

  return categories;
}

function generateToolSection(tools: Tool[]): string {
  const categories = categorizeTools(tools);
  const lines: string[] = [START_MARKER, ''];
  lines.push(`**${String(tools.length)} tools** across ${String(categories.size)} categories:\n`);

  const order = [
    'Setup', 'Pattern Editing', 'Playback', 'Storage', 'History',
    'Generation', 'Music Theory', 'Transform', 'AI', 'Analysis',
    'Session', 'Export', 'Audio', 'Debug', 'Other',
  ];

  for (const cat of order) {
    const catTools = categories.get(cat);
    if (catTools === undefined) continue;
    lines.push(`<details><summary><strong>${cat}</strong> (${String(catTools.length)})</summary>\n`);
    lines.push('| Tool | Description |');
    lines.push('|------|-------------|');
    for (const t of catTools) {
      lines.push(`| \`${t.name}\` | ${t.description} |`);
    }
    lines.push('\n</details>\n');
  }

  lines.push(`_Auto-generated from source. ${String(tools.length)} tools registered._`);
  lines.push('', END_MARKER);
  return lines.join('\n');
}

function inject(): void {
  const tools = extractTools();
  console.log(`Found ${String(tools.length)} tools in source`);

  let readme = readFileSync(README_PATH, 'utf-8');
  const section = generateToolSection(tools);

  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);

  if (startIdx !== -1 && endIdx !== -1) {
    readme = readme.slice(0, startIdx) + section + readme.slice(endIdx + END_MARKER.length);
  } else {
    console.log('No markers found in README.md. Add <!-- TOOLS:START --> and <!-- TOOLS:END --> markers.');
    return;
  }

  // Also update tool count badge
  readme = readme.replace(
    /tools-\d+-green/,
    `tools-${String(tools.length)}-green`
  );

  writeFileSync(README_PATH, readme);
  console.log(`Injected ${String(tools.length)} tools into README.md`);
}

function check(): void {
  const tools = extractTools();
  const readme = readFileSync(README_PATH, 'utf-8');
  const expected = generateToolSection(tools);

  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    console.error('No tool markers found in README.md');
    process.exit(1);
  }

  const current = readme.slice(startIdx, endIdx + END_MARKER.length);
  if (current !== expected) {
    console.error(`Tool documentation drift detected (${String(tools.length)} tools in source)`);
    console.error('Run: npx tsx scripts/generate-tool-docs.ts');
    process.exit(1);
  }

  console.log(`Tool documentation current: ${String(tools.length)} tools`);
}

const command = process.argv[2];
if (command === 'check') {
  check();
} else {
  inject();
}
