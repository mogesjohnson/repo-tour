import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { narrate, language, ollamaAvailable, polish } from '../src/narrate.mjs';

const say = (file, category, src) => narrate({ file, category }, src);

test('language names come from the extension', () => {
  assert.equal(language('a/b.ts'), 'TypeScript');
  assert.equal(language('x.PY'), 'Python');
  assert.equal(language('Makefile'), 'Makefile');
  assert.equal(language('docker/Dockerfile'), 'Dockerfile');
  assert.equal(language('LICENSE'), 'text');
});

test('README captions use the title, first paragraph and section headings', () => {
  const src = '# Widget Kit\n\n<img src="logo.png">\n\nBuilds **widgets** from [specs](docs/spec.md)\nfast.\n\n## Install\n\n```sh\n## not a heading\n```\n\n## Usage\n## API\n## FAQ\n## License\n';
  const c = say('README.md', 'overview', src);
  assert.match(c, /^Start here: the README introduces \*\*Widget Kit\*\*\./);
  assert.match(c, /Builds widgets from specs fast\./);
  assert.match(c, /Sections include `Install`, `Usage`, `API`, `FAQ` and 1 more\./);
  assert.doesNotMatch(c, /not a heading/);
});

test('agent files: HTML comments are dropped and @imports are named', () => {
  const agents = say('AGENTS.md', 'agent', '# AGENTS.md\n<!-- keep under 70 lines -->\n\nRun npm test before pushing.\n\n## Commands\n');
  assert.match(agents, /^Instructions for AI coding agents/);
  assert.match(agents, /Run npm test before pushing\./);
  assert.doesNotMatch(agents, /70 lines|-->/);
  const claude = say('CLAUDE.md', 'agent', '@AGENTS.md\n<!-- Claude reads this file -->\n');
  assert.equal(claude, 'Instructions for AI coding agents working in this repo. It imports `AGENTS.md` instead of repeating its rules.');
});

test('JavaScript: docstring, exports, packages and local imports', () => {
  const src = "/**\n * Parses config files.\n * @module config\n */\nimport fs from 'node:fs';\nimport yaml from 'yaml';\nimport { x } from './x.js';\nexport function load() {}\nexport const DEFAULTS = {};\nexport default class Loader {}\n";
  const c = say('src/config.js', 'module', src);
  assert.equal(c, 'A key JavaScript module. Parses config files. It defines `load`, `DEFAULTS` and `Loader`. Uses `fs` and `yaml` plus 1 local import.');
});

test('entry points mention language and size', () => {
  const c = say('bin/cli.js', 'entry', "#!/usr/bin/env node\nimport { run } from '../src/run.js';\nrun();\n");
  assert.match(c, /^An entry point, where execution starts \(JavaScript, 4 lines\)\./);
  assert.match(c, /Pulls in `\.\.\/src\/run\.js`\./);
});

test('Python: module docstring, defs, classes and imports', () => {
  const src = '"""Command line entry for the app."""\nimport os\nfrom pathlib import Path\nfrom .core import run\n\ndef main():\n    pass\n\nclass App:\n    pass\n';
  const c = say('app/__main__.py', 'entry', src);
  assert.match(c, /Command line entry for the app\./);
  assert.match(c, /It defines `main` and `App`\./);
  assert.match(c, /Uses `os` and `pathlib` plus 1 local import\./);
});

test('long docstrings are cut at a word with an ellipsis', () => {
  const c = say('src/a.js', 'module', `// ${'word '.repeat(80)}\nexport const a = 1;\n`);
  assert.match(c, /word…/);
  assert.ok(c.length < 330);
});

test('package.json: name, description, scripts and dependencies', () => {
  const pkg = { name: 'demo', description: 'Makes demos', scripts: { test: 'x', build: 'y' }, dependencies: { a: '1', b: '1' }, devDependencies: { c: '1' } };
  assert.equal(say('package.json', 'config', JSON.stringify(pkg)),
    'Defines the `demo` package: Makes demos. Scripts: `test` and `build`. It depends on 2 runtime and 1 dev packages, including `a` and `b`.');
  assert.match(say('package.json', 'config', '{"name":"x"}'), /It has no dependencies\./);
  assert.equal(say('package.json', 'config', '{not json'), 'A JSON file.');
  assert.equal(say('.claude/settings.json', 'agent', '{"a":1,"b":2}'), 'JSON settings with top-level keys `a` and `b`.');
});

test('workflows: name, triggers and jobs', () => {
  const block = 'name: ci\non:\n  pull_request:\n  push:\n    branches: [main]\njobs:\n  verify:\n    runs-on: ubuntu-latest\n  deploy:\n    runs-on: ubuntu-latest\n';
  assert.equal(say('.github/workflows/ci.yml', 'ci', block), 'CI workflow "ci" that runs on `pull_request` and `push` with jobs `verify` and `deploy`.');
  const inline = 'name: lint\non: [push, pull_request]\njobs:\n  lint:\n    runs-on: ubuntu-latest\n';
  assert.equal(say('.github/workflows/lint.yml', 'ci', inline), 'CI workflow "lint" that runs on `push` and `pull_request` with job `lint`.');
});

// --ollama: fetch is mocked, so no server is needed.
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const respond = (status, body) => async () => new Response(JSON.stringify(body), { status });

test('ollamaAvailable is true only when /api/tags answers OK', async () => {
  const seen = [];
  globalThis.fetch = async (url, opts) => { seen.push([url, !!opts.signal]); return new Response('{}', { status: 200 }); };
  assert.equal(await ollamaAvailable(), true);
  assert.deepEqual(seen, [['http://localhost:11434/api/tags', true]]);
  globalThis.fetch = respond(500, {});
  assert.equal(await ollamaAvailable(), false);
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  assert.equal(await ollamaAvailable(), false);
});

test('polish sends the model and caption and returns the cleaned reply', async () => {
  let sent;
  globalThis.fetch = async (url, opts) => { sent = { url, body: JSON.parse(opts.body) }; return new Response(JSON.stringify({ response: '  A friendly\n caption.  ' })); };
  assert.equal(await polish('llama3.2', 'src/a.js', 'Old caption.', 'const a = 1;'), 'A friendly caption.');
  assert.equal(sent.url, 'http://localhost:11434/api/generate');
  assert.equal(sent.body.model, 'llama3.2');
  assert.equal(sent.body.stream, false);
  assert.match(sent.body.prompt, /Old caption\./);
  assert.match(sent.body.prompt, /src\/a\.js/);
});

test('polish falls back to the original caption on any failure', async () => {
  const cases = [
    async () => { throw new Error('ECONNREFUSED'); },
    respond(404, { error: 'model not found' }),
    respond(200, { response: '' }),
    respond(200, { response: 'x'.repeat(500) }),
    async () => new Response('not json'),
  ];
  for (const f of cases) {
    globalThis.fetch = f;
    assert.equal(await polish('m', 'a.js', 'Keep me.', ''), 'Keep me.');
  }
});
