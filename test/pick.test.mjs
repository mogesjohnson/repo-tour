import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickFiles, walk } from '../src/pick.mjs';
import { fixture } from './helpers.mjs';

const order = (root, opts) => pickFiles(root, opts).picked.map((p) => `${p.category}:${p.file}`);

test('tours README, agent files, config, entry, key modules and CI in that order', () => {
  const root = fixture({
    'README.md': '# Demo\n',
    'AGENTS.md': '# Rules\n',
    'CLAUDE.md': '@AGENTS.md\n',
    '.claude/settings.json': '{}',
    'package.json': JSON.stringify({ name: 'demo', bin: { demo: './bin/cli.js' } }),
    'bin/cli.js': "import { run } from '../src/core.js';\nrun();\n",
    'src/core.js': "import { util } from './util.js';\nexport function run() {}\n",
    'src/util.js': 'export const util = 1;\n',
    'src/lonely.js': 'export const x = 1;\n',
    '.github/workflows/ci.yml': 'name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n',
  });
  const got = order(root);
  assert.deepEqual(got.slice(0, 6), ['overview:README.md', 'agent:AGENTS.md', 'agent:CLAUDE.md', 'agent:.claude/settings.json', 'config:package.json', 'entry:bin/cli.js']);
  assert.equal(got.at(-1), 'ci:.github/workflows/ci.yml');
  const modules = got.filter((g) => g.startsWith('module:'));
  // core.js and util.js are each imported once; lonely.js by nobody, so it ranks last.
  assert.equal(modules.at(-1), 'module:src/lonely.js');
  assert.ok(modules.indexOf('module:src/util.js') < modules.indexOf('module:src/lonely.js'));
});

test('ranks the most-imported module first', () => {
  const imp = (n) => Array.from({ length: n }, () => "import './shared.js';").join('\n');
  const root = fixture({
    'src/shared.js': 'export const s = 1;\n',
    'src/a.js': imp(1), 'src/b.js': imp(1), 'src/c.js': imp(1),
    'src/big.js': 'const x = 1;\n'.repeat(300),
  });
  assert.equal(order(root)[0], 'module:src/shared.js');
});

test('counts relative Python imports, including parent packages', () => {
  const root = fixture({
    'pkg/core/models.py': 'class Model: pass\n',
    'pkg/api/views.py': 'from ..core.models import Model\n',
    'pkg/api/urls.py': 'from ..core import models\nfrom .views import x\n',
    'pkg/api/admin.py': 'from ..core.models import Model\n',
    'pkg/big.py': 'x = 1\n'.repeat(350),
  });
  assert.equal(order(root)[0], 'module:pkg/core/models.py');
});

test('respects --max and still keeps CI', () => {
  const files = { 'README.md': '# R\n', '.github/workflows/ci.yml': 'name: ci\n' };
  for (let i = 0; i < 10; i++) files[`src/m${i}.js`] = `export const m${i} = ${i};\n`;
  const got = order(fixture(files), { max: 4 });
  assert.equal(got.length, 4);
  assert.equal(got[0], 'overview:README.md');
  assert.equal(got.at(-1), 'ci:.github/workflows/ci.yml');
});

test('skips tests, fixtures, examples, node_modules and build output', () => {
  const root = fixture({
    'src/app.js': 'export const a = 1;\n',
    'test/app.test.js': "import '../src/app.js';\n",
    'src/app.spec.ts': 'x',
    'examples/demo.js': 'x',
    'node_modules/dep/index.js': 'x',
    'dist/bundle.js': 'x',
  });
  assert.deepEqual(walk(root).filter((f) => f.startsWith('node_modules') || f.startsWith('dist')), []);
  assert.deepEqual(order(root), ['entry:src/app.js']);
});

test('skips files over 200 KB', () => {
  const root = fixture({ 'src/huge.js': 'x'.repeat(200_001), 'src/ok.js': 'export const ok = 1;\n' });
  assert.deepEqual(walk(root), ['src/ok.js']);
});

test('docs-only repos get one Markdown file per top-level folder', () => {
  const root = fixture({ 'README.md': '# R\n', 'guide/a.md': '# A\n', 'guide/b.md': '# B\n', 'notes/c.md': '# C\n' });
  assert.deepEqual(order(root), ['overview:README.md', 'docs:guide/a.md', 'docs:notes/c.md']);
});

test('an empty folder gives an empty tour', () => {
  assert.deepEqual(pickFiles(fixture({})).picked, []);
});
