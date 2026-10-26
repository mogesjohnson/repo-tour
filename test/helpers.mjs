import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after } from 'node:test';

// Build a throwaway repo from { 'path/to/file': 'contents' } and remove it after the file's tests.
export function fixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), 'repo-tour-test-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  }
  after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

export const step = (over = {}) => ({ file: 'src/a.js', category: 'module', language: 'JavaScript', caption: 'A key module.', code: 'const a = 1;', ...over });
