// Choose the files worth touring: overview, agent instructions, config,
// entry points, the most-imported modules and CI.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'out', 'coverage', 'vendor',
  '.venv', 'venv', '__pycache__', '.next', 'target', '.cache', 'tour']);
const CODE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs',
  '.rb', '.java', '.kt', '.swift', '.c', '.h', '.cpp', '.cs', '.php', '.sh', '.vue', '.svelte']);
const AGENT_FILES = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursorrules',
  '.github/copilot-instructions.md', '.windsurfrules'];
const CONFIG_FILES = ['package.json', 'pyproject.toml', 'setup.py', 'requirements.txt', 'Cargo.toml',
  'go.mod', 'Gemfile', 'pom.xml', 'build.gradle', 'tsconfig.json', 'Makefile', 'Dockerfile',
  'docker-compose.yml', 'vite.config.ts', 'vite.config.js', 'deno.json'];
const ENTRY_NAMES = /^(main|index|cli|app|server|__main__|mod|lib)\.[a-z]+$/i;
const MAX_BYTES = 200_000;

export function walk(root) {
  const files = [];
  const visit = (dir, depth) => {
    if (depth > 6 || files.length > 5000) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !(e.name.startsWith('.') && !['.github', '.claude', '.codex'].includes(e.name))) visit(full, depth + 1);
      } else if (e.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        try { if (statSync(full).size <= MAX_BYTES) files.push(rel); } catch { /* unreadable */ }
      }
    }
  };
  visit(root, 0);
  return files.sort();
}

const read = (root, rel) => { try { return readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; } };

// Count how often each code file is imported by the others (relative imports only).
function importCounts(root, codeFiles) {
  const set = new Set(codeFiles);
  const counts = new Map(codeFiles.map((f) => [f, 0]));
  const re = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|require\(\s*|^\s*import\s+)['"](\.{1,2}\/[^'"]+)['"]|^\s*from\s+(\.+[\w.]*)\s+import/gm;
  for (const f of codeFiles) {
    const src = read(root, f);
    for (const m of src.matchAll(re)) {
      let spec = m[1];
      if (!spec && m[2]) spec = m[2].replace(/^(\.+)(.*)$/, (_, d, rest) => (d.length === 1 ? './' : '../'.repeat(d.length - 1)) + rest.replace(/\./g, '/'));
      if (!spec) continue;
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
      const ext = path.posix.extname(f);
      const cands = [base, base + ext, base + '.js', base + '.ts', base + '.mjs', base + '.py', base + '/index.js', base + '/index.ts', base + '/__init__.py',
        base.replace(/\.js$/, '.ts')];
      const hit = cands.find((c) => set.has(c));
      if (hit && hit !== f) counts.set(hit, counts.get(hit) + 1);
    }
  }
  return counts;
}

function packageEntries(root) {
  const out = new Set();
  const raw = read(root, 'package.json');
  if (!raw) return out;
  try {
    const pkg = JSON.parse(raw);
    const add = (p) => typeof p === 'string' && out.add(p.replace(/^\.\//, ''));
    add(pkg.main); add(pkg.module);
    if (typeof pkg.bin === 'string') add(pkg.bin); else Object.values(pkg.bin || {}).forEach(add);
  } catch { /* bad json */ }
  return out;
}

export function pickFiles(root, { max = 12 } = {}) {
  const files = walk(root);
  const has = new Set(files);
  const picked = [];
  const seen = new Set();
  const add = (file, category) => {
    if (!has.has(file) || seen.has(file)) return;
    seen.add(file); picked.push({ file, category });
  };
  const readme = files.find((f) => /^readme(\.md|\.rst|\.txt)?$/i.test(f));
  if (readme) add(readme, 'overview');
  AGENT_FILES.forEach((f) => add(f, 'agent'));
  for (const d of ['.claude', '.codex']) {
    files.filter((f) => f.startsWith(d + '/') && /\.(md|json|toml)$/.test(f)).slice(0, 1).forEach((f) => add(f, 'agent'));
  }
  CONFIG_FILES.forEach((f) => add(f, 'config'));
  const code = files.filter((f) => CODE_EXT.has(path.posix.extname(f)) && !/(^|\/)(tests?|__tests__|spec|examples?|fixtures)\//.test(f) && !/\.(test|spec)\.[a-z]+$/.test(f));
  const entries = [...packageEntries(root)].filter((f) => has.has(f));
  for (const f of code) {
    if (f.split('/').length <= 3 && ENTRY_NAMES.test(path.posix.basename(f))) entries.push(f);
  }
  entries.slice(0, 3).forEach((f) => add(f, 'entry'));
  const counts = importCounts(root, code);
  const ranked = code.filter((f) => !seen.has(f))
    .map((f) => ({ f, score: counts.get(f) * 10 + Math.min(read(root, f).split('\n').length, 400) / 100 - f.split('/').length }))
    .sort((a, b) => b.score - a.score);
  const workflows = files.filter((f) => /^\.github\/workflows\/.+\.ya?ml$/.test(f));
  const room = Math.max(0, max - picked.length - (workflows.length ? 1 : 0));
  ranked.slice(0, room).forEach(({ f }) => add(f, 'module'));
  if (workflows.length) add(workflows[0], 'ci');
  if (!picked.some((p) => p.category === 'module' || p.category === 'entry')) {
    // Docs-heavy repos: tour the biggest top-level folders' first markdown file instead.
    const docs = files.filter((f) => /\.md$/i.test(f) && !seen.has(f) && f.includes('/'));
    const byDir = new Map();
    for (const f of docs) { const d = f.split('/')[0]; if (!byDir.has(d)) byDir.set(d, f); }
    [...byDir.values()].slice(0, Math.max(0, max - picked.length)).forEach((f) => add(f, 'docs'));
  }
  return { picked: picked.slice(0, max), total: files.length, exists: (f) => existsSync(path.join(root, f)) };
}
