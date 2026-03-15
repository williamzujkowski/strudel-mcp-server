#!/usr/bin/env npx tsx
/**
 * Changelog Generator
 *
 * Generates an "Unreleased" changelog section from git commits since the
 * last version tag. Groups commits by conventional commit type.
 *
 * Usage:
 *   npx tsx scripts/generate-changelog.ts          # print unreleased changes
 *   npx tsx scripts/generate-changelog.ts --inject  # inject into CHANGELOG.md
 *
 * @module scripts/generate-changelog
 */

/* eslint-disable no-console */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');

interface Commit {
  hash: string;
  type: string;
  scope: string;
  subject: string;
  breaking: boolean;
}

function getLastTag(): string {
  try {
    return execSync('git describe --tags --abbrev=0', { cwd: ROOT, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function getCommitsSinceTag(tag: string): Commit[] {
  const range = tag !== '' ? `${tag}..HEAD` : 'HEAD';
  const raw = execSync(
    `git log ${range} --pretty=format:"%h|%s" --no-merges`,
    { cwd: ROOT, encoding: 'utf-8' }
  ).trim();

  if (raw === '') return [];

  return raw.split('\n').map((line) => {
    const [hash = '', subject = ''] = line.split('|', 2);
    // Parse conventional commit: type(scope): subject
    const match = subject.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/);
    if (match !== null) {
      return {
        hash,
        type: match[1] ?? '',
        scope: match[2] ?? '',
        subject: match[4] ?? '',
        breaking: match[3] === '!',
      };
    }
    return { hash, type: 'other', scope: '', subject, breaking: false };
  });
}

function getToolCount(): number {
  try {
    const serverPath = join(ROOT, 'src/server/server.ts');
    const content = readFileSync(serverPath, 'utf-8');
    const matches = content.matchAll(/name:\s*'([^']+)'/g);
    let count = 0;
    for (const m of matches) {
      if (m[1] !== 'strudel-mcp-enhanced') count++;
    }
    return count;
  } catch {
    return 0;
  }
}

const TYPE_LABELS: Record<string, string> = {
  feat: 'New Features',
  fix: 'Fixed',
  refactor: 'Refactored',
  perf: 'Performance',
  docs: 'Documentation',
  test: 'Tests',
  chore: 'Maintenance',
  ci: 'CI/CD',
  other: 'Other',
};

const TYPE_ORDER = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'ci', 'other'];

function generateSection(commits: Commit[]): string {
  const grouped = new Map<string, Commit[]>();
  for (const c of commits) {
    const key = c.type in TYPE_LABELS ? c.type : 'other';
    const list = grouped.get(key) ?? [];
    list.push(c);
    grouped.set(key, list);
  }

  const lines: string[] = [];
  const tag = getLastTag();
  const toolCount = getToolCount();

  lines.push('## [Unreleased]');
  lines.push('');
  if (toolCount > 0) lines.push(`> ${String(toolCount)} tools registered`);
  if (tag !== '') lines.push(`> Since ${tag}`);
  lines.push('');

  for (const type of TYPE_ORDER) {
    const group = grouped.get(type);
    if (group === undefined || group.length === 0) continue;

    lines.push(`### ${TYPE_LABELS[type] ?? type}`);
    lines.push('');
    for (const c of group) {
      const scope = c.scope !== '' ? `**${c.scope}**: ` : '';
      const breaking = c.breaking ? '**BREAKING** ' : '';
      lines.push(`- ${breaking}${scope}${c.subject}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main(): void {
  const inject = process.argv.includes('--inject');
  const tag = getLastTag();
  const commits = getCommitsSinceTag(tag);

  if (commits.length === 0) {
    console.log('No unreleased commits found.');
    return;
  }

  console.log(`Found ${String(commits.length)} commits since ${tag || 'beginning'}`);
  const section = generateSection(commits);

  if (inject) {
    let changelog = readFileSync(CHANGELOG_PATH, 'utf-8');
    // Replace existing [Unreleased] section or insert before first version
    const unreleasedIdx = changelog.indexOf('## [Unreleased]');
    const firstVersionIdx = changelog.indexOf('\n## [', unreleasedIdx > -1 ? unreleasedIdx + 1 : 0);

    if (unreleasedIdx > -1 && firstVersionIdx > -1) {
      changelog = changelog.slice(0, unreleasedIdx) + section + '\n' + changelog.slice(firstVersionIdx + 1);
    } else if (firstVersionIdx > -1) {
      changelog = changelog.slice(0, firstVersionIdx + 1) + section + '\n' + changelog.slice(firstVersionIdx + 1);
    } else {
      changelog += '\n' + section;
    }

    writeFileSync(CHANGELOG_PATH, changelog);
    console.log('Injected into CHANGELOG.md');
  } else {
    console.log('');
    console.log(section);
  }
}

main();
