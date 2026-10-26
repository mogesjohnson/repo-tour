import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fixture } from './helpers.mjs';

const BIN = fileURLToPath(new URL('../bin/repo-tour.mjs', import.meta.url));
const run = (args, cwd) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', timeout: 20_000 });
const repo = () => fixture({
  'README.md': '# Demo\n\nA demo repo.\n',
  'AGENTS.md': '# Rules\n',
  'src/index.js': "import { a } from './a.js';\nexport const main = () => a;\n",
  'src/a.js': 'export const a = 1;\n',
});

test('--help prints usage and exits 0', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^Usage: repo-tour \[repo-dir\] \[options\]/);
  for (const flag of ['--out', '--max', '--lines', '--name', '--no-html', '--no-md', '--video', '--seconds', '--ollama']) assert.match(r.stdout, new RegExp(flag));
});

test('writes index.html and tour.md with the chosen name', () => {
  const root = repo();
  const out = path.join(root, 'out');
  const r = run([root, '--out', out, '--name', 'me/demo']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /repo-tour: 4 stops from 4 files/);
  assert.match(readFileSync(path.join(out, 'index.html'), 'utf8'), /<title>Tour of me\/demo<\/title>/);
  const md = readFileSync(path.join(out, 'tour.md'), 'utf8');
  assert.match(md, /^# Tour of me\/demo/);
  assert.match(md, /## 2\. `AGENTS\.md` \(Agent file\)/);
});

test('defaults: the folder name and ./tour in the current directory', () => {
  const root = repo();
  const r = run(['.'], root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(readFileSync(path.join(root, 'tour', 'tour.md'), 'utf8'), new RegExp(`^# Tour of ${path.basename(root)}`));
});

test('--no-html, --no-md, --max and --lines are honoured', () => {
  const root = repo();
  const out = path.join(root, 'o');
  assert.equal(run([root, '--out', out, '--no-html', '--max', '2']).status, 0);
  assert.equal(existsSync(path.join(out, 'index.html')), false);
  assert.equal((readFileSync(path.join(out, 'tour.md'), 'utf8').match(/^## /gm) || []).length, 2);
  const out2 = path.join(root, 'o2');
  assert.equal(run([root, '--out', out2, '--no-md', '--lines', '1']).status, 0);
  assert.equal(existsSync(path.join(out2, 'tour.md')), false);
  assert.match(readFileSync(path.join(out2, 'index.html'), 'utf8'), /… 2 more lines/);
});

test('bad arguments exit 1 with a clear message', () => {
  const root = repo();
  const cases = [
    [['--bogus'], /Unknown option --bogus/],
    [['--out'], /--out needs a value/],
    [['--max', 'abc'], /must be positive numbers/],
    [['--max', '0'], /must be positive numbers/],
    [['--seconds', '-1'], /must be positive numbers/],
    [[path.join(root, 'missing')], /Not a folder/],
    [[path.join(root, 'README.md')], /Not a folder/],
  ];
  for (const [args, msg] of cases) {
    const r = run(args, root);
    assert.equal(r.status, 1, args.join(' '));
    assert.match(r.stderr, msg);
  }
});

test('an empty repo exits 1', () => {
  const r = run([fixture({})]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Found no files to tour/);
});

test('--ollama without a reachable server keeps the heuristic captions', { skip: process.env.OLLAMA_RUNNING && 'Ollama is running here' }, () => {
  const root = repo();
  const out = path.join(root, 'out');
  const r = run([root, '--out', out, '--ollama', 'llama3.2']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /ollama: not reachable at localhost:11434, using heuristic captions/);
  assert.match(readFileSync(path.join(out, 'tour.md'), 'utf8'), /Start here: the README introduces \*\*Demo\*\*\. A demo repo\./);
});
