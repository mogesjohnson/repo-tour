import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { renderHtml, renderMarkdown } from '../src/render.mjs';
import { step } from './helpers.mjs';

const tour = (steps, over = {}) => ({ name: 'me/demo', total: 42, steps, ...over });

// Pull the shipped highlighter out of the generated page and run it in a sandbox.
function highlighter() {
  const html = renderHtml(tour([step()]));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const code = scripts.at(-1).split('\nconst T=')[0];
  return vm.runInNewContext(`${code}; hl`);
}
const strip = (lines) => lines.join('\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

test('the page is self-contained: no remote scripts, styles, fonts or fetches', () => {
  const html = renderHtml(tour([step({ code: '<script src="https://evil.example/x.js"></script>\nfetch("https://x.example")' })]));
  const shell = html.replace(/<script type="application\/json" id="data">[\s\S]*?<\/script>/, '');
  assert.doesNotMatch(shell, /\b(src|href)\s*=\s*["']?(https?:)?\/\//i);
  assert.doesNotMatch(shell, /<link\b|@import|url\(|\bfetch\(|XMLHttpRequest|import\(/i);
  assert.equal((shell.match(/<script/g) || []).length, 1, 'one inline script, no external ones');
});

test('file contents cannot break out of the data block', () => {
  const html = renderHtml(tour([step({ code: '</script><script>alert(1)</script>', caption: '</script>' })], { name: '<b>x</b>' }));
  const data = html.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(data, /</);
  assert.equal(JSON.parse(data).steps[0].code, '</script><script>alert(1)</script>');
  assert.match(html, /<title>Tour of &lt;b&gt;x&lt;\/b&gt;<\/title>/);
});

test('the inline app script parses', () => {
  const html = renderHtml(tour([step()]));
  const app = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  assert.doesNotThrow(() => new vm.Script(app));
});

test('highlighter marks keywords, strings, numbers, calls and comments', () => {
  const hl = highlighter();
  const [line] = hl('const greet = say("hi", 42); // done', 'JavaScript');
  assert.match(line, /<span class=k>const<\/span>/);
  assert.match(line, /<span class=f>say<\/span>/);
  assert.match(line, /<span class=s>"hi"<\/span>/);
  assert.match(line, /<span class=n>42<\/span>/);
  assert.match(line, /<span class=c>\/\/ done<\/span>/);
});

test('highlighter keeps one balanced line per source line, even in block comments', () => {
  const hl = highlighter();
  const src = '/**\n * a <b> & c\n */\nconst s = `x\ny`;';
  const lines = hl(src, 'JavaScript');
  assert.equal(lines.length, 5);
  for (const l of lines) assert.equal((l.match(/<span/g) || []).length, (l.match(/<\/span>/g) || []).length, l);
  assert.equal(strip(lines), src);
});

test('highlighter uses # comments for hash languages and headings for Markdown', () => {
  const hl = highlighter();
  assert.match(hl('x = 1  # note', 'Python')[0], /<span class=c># note<\/span>/);
  assert.match(hl('# Title', 'Markdown')[0], /<span class=h># Title<\/span>/);
  assert.match(hl('- item', 'Markdown')[0], /^<span class=k>-<\/span> item$/);
  assert.equal(strip(hl('if a < b && c > d:', 'Python')), 'if a < b && c > d:');
});

test('Markdown tour: title, numbered stops, captions and fenced snippets', () => {
  const md = renderMarkdown(tour([
    step({ file: 'README.md', category: 'overview', language: 'Markdown', caption: 'Start here.', code: '# Hi' }),
    step({ file: 'src/a.py', category: 'module', language: 'Python', caption: 'Does things.', code: 'def a():\n    pass' }),
  ]));
  assert.match(md, /^# Tour of me\/demo\n\n2 stops, picked from 42 files by \[repo-tour\]/);
  assert.match(md, /## 1\. `README\.md` \(Overview\)\n\nStart here\.\n\n```md\n# Hi\n```/);
  assert.match(md, /## 2\. `src\/a\.py` \(Key module\)\n\nDoes things\.\n\n```python\ndef a\(\):\n    pass\n```/);
  assert.doesNotMatch(md, /First \d+ of/);
});

test('Markdown tour trims long files and defuses fences inside code', () => {
  const code = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n') + '\n```';
  const md = renderMarkdown(tour([step({ code: '```js\nx\n```\n' + code, language: 'Rust' })]), { snippetLines: 5 });
  assert.match(md, /```rust\n`\u200b``js\nx\n`\u200b``\nline 1\nline 2\n```/);
  assert.match(md, /<sub>First 5 of 34 lines\.<\/sub>/);
  assert.equal((md.match(/^```/gm) || []).length, 2);
  assert.match(md, /^# Tour of me\/demo\n\n1 stop, picked from 42 files/);
});
