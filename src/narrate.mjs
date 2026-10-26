// Heuristic narration: no AI needed. Reads file type, imports, exports,
// docstrings and headings and turns them into one or two short sentences.
import path from 'node:path';

const LANG = { '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'React JSX', '.ts': 'TypeScript',
  '.tsx': 'React TSX', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.rb': 'Ruby', '.java': 'Java', '.kt': 'Kotlin',
  '.swift': 'Swift', '.c': 'C', '.h': 'C header', '.cpp': 'C++', '.cs': 'C#', '.php': 'PHP', '.sh': 'shell',
  '.md': 'Markdown', '.json': 'JSON', '.yml': 'YAML', '.yaml': 'YAML', '.toml': 'TOML', '.vue': 'Vue', '.svelte': 'Svelte' };

export const language = (file) => LANG[path.posix.extname(file).toLowerCase()] || (/Makefile$/.test(file) ? 'Makefile' : /Dockerfile$/.test(file) ? 'Dockerfile' : 'text');

const list = (items, n = 4) => {
  const a = [...new Set(items)].filter(Boolean);
  if (!a.length) return '';
  const head = a.slice(0, n).map((x) => `\`${x}\``);
  const more = a.length > n ? ` and ${a.length - n} more` : '';
  return head.length > 1 ? `${head.slice(0, -1).join(', ')}${more ? ', ' + head.at(-1) + more : ' and ' + head.at(-1)}` : head[0] + more;
};
const clean = (s) => s.replace(/\s+/g, ' ').replace(/[*_`]/g, '').trim();
const sentence = (s, max = 220) => {
  const t = clean(s);
  const cut = t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
  return cut && !/[.!?…:]$/.test(cut) ? cut + '.' : cut;
};

function markdown(src) {
  const imports = [...src.matchAll(/^@(\S+)\s*$/gm)].map((m) => m[1]);
  const lines = src.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^@\S+\s*$/.test(l));
  let fenced = false;
  const prose = lines.filter((l) => { if (/^\s*(```|~~~)/.test(l)) { fenced = !fenced; return false; } return !fenced; });
  const title = (prose.find((l) => /^#\s/.test(l)) || '').replace(/^#\s+/, '');
  const heads = prose.filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  let para = '';
  let inFence = false;
  for (const l of lines) {
    if (/^```/.test(l)) inFence = !inFence;
    if (inFence || /^\s*(#|<|!\[|\||-{3,}|>\s*\[!)/.test(l)) { if (para) break; continue; }
    if (!l.trim()) { if (para) break; continue; }
    para += ' ' + l.trim();
  }
  return { imports, title: clean(title), heads, para: sentence(para.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')) };
}

function leadingDoc(src) {
  const m = src.match(/^\s*(?:#!.*\n)?\s*(?:\/\*\*?([\s\S]*?)\*\/|((?:\s*\/\/.*\n)+)|("""|''')([\s\S]*?)\3|((?:\s*#(?!!).*\n)+))/);
  if (!m) return '';
  const raw = m[1] || m[2] || m[4] || m[5] || '';
  return sentence(raw.replace(/^\s*(\*|\/\/|#)\s?/gm, ' ').replace(/@\w+.*$/gm, ''));
}

function codeFacts(src) {
  const imports = [];
  for (const m of src.matchAll(/(?:from\s+|require\(\s*|import\s+)['"]([^'"]+)['"]/g)) imports.push(m[1]);
  for (const m of src.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)) imports.push(m[1] || m[2]);
  const exports = [];
  for (const m of src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) exports.push(m[1]);
  for (const m of src.matchAll(/^(?:async\s+)?(?:def|class)\s+([A-Za-z]\w*)/gm)) exports.push(m[1]);
  for (const m of src.matchAll(/^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)/gm)) exports.push(m[1]);
  for (const m of src.matchAll(/^pub\s+(?:fn|struct|enum|trait)\s+(\w+)/gm)) exports.push(m[1]);
  for (const m of src.matchAll(/module\.exports\s*=\s*\{([^}]*)\}/g)) exports.push(...m[1].split(',').map((s) => s.split(':')[0].trim()));
  const local = imports.filter((i) => i.startsWith('.'));
  const pkgs = imports.filter((i) => !i.startsWith('.')).map((i) => i.replace(/^node:/, '').split('/').slice(0, i.startsWith('@') ? 2 : 1).join('/'));
  return { local, pkgs, exports };
}

function jsonFacts(file, src) {
  try {
    const j = JSON.parse(src);
    if (/package\.json$/.test(file)) {
      const deps = Object.keys(j.dependencies || {});
      const dev = Object.keys(j.devDependencies || {});
      const parts = [`Defines the \`${j.name || 'unnamed'}\` package${j.description ? ': ' + sentence(j.description).replace(/\.$/, '') : ''}.`];
      if (j.scripts) parts.push(`Scripts: ${list(Object.keys(j.scripts), 5)}.`);
      parts.push(deps.length || dev.length ? `It depends on ${deps.length} runtime and ${dev.length} dev packages${deps.length ? ', including ' + list(deps, 3) : ''}.` : 'It has no dependencies.');
      return parts.join(' ');
    }
    return `JSON settings with top-level keys ${list(Object.keys(j), 5)}.`;
  } catch { return 'A JSON file.'; }
}

function workflowFacts(src) {
  const name = (src.match(/^name:\s*(.+)$/m) || [])[1];
  const on = src.match(/^on:[ \t]*\n([\s\S]*?)^\S/m);
  const triggers = on ? [...on[1].matchAll(/^\s{2}(\w+):?/gm)].map((m) => m[1]) : [];
  const inline = (src.match(/^on:\s*\[?([\w, ]+)\]?\s*$/m) || [])[1];
  const jobs = src.match(/^jobs:\s*\n([\s\S]*)/m);
  const jobNames = jobs ? [...jobs[1].matchAll(/^ {2}([\w-]+):/gm)].map((m) => m[1]) : [];
  return `CI workflow${name ? ` "${name.trim().replace(/['"]/g, '')}"` : ''} that runs on ${list(triggers.length ? triggers : (inline || 'push').split(/,\s*/), 4)} with job${jobNames.length === 1 ? '' : 's'} ${list(jobNames, 4) || 'steps'}.`;
}

const ROLE = {
  overview: 'Start here: the README introduces the project.',
  agent: 'Instructions for AI coding agents working in this repo.',
  config: 'Project configuration.',
  entry: 'An entry point, where execution starts.',
  module: 'A key module that other files lean on.',
  ci: 'Continuous integration.',
  docs: 'Documentation for one part of the repo.',
};

export function narrate({ file, category }, src) {
  const lang = language(file);
  const lines = src.split('\n').length;
  const out = [];
  if (lang === 'Markdown') {
    const { imports, title, heads, para } = markdown(src);
    out.push(category === 'agent' ? ROLE.agent : category === 'overview' ? `Start here: the README introduces ${title ? `**${title}**` : 'the project'}.` : `${title ? `**${title}**` : 'Notes'}.`);
    if (imports.length) out.push(`It imports ${list(imports)} instead of repeating its rules.`);
    if (para) out.push(para);
    if (heads.length) out.push(`Sections include ${list(heads, 4)}.`);
  } else if (lang === 'JSON') {
    out.push(jsonFacts(file, src));
  } else if (category === 'ci' || /\.github\/workflows\//.test(file)) {
    out.push(workflowFacts(src));
  } else {
    const doc = leadingDoc(src);
    const { local, pkgs, exports } = codeFacts(src);
    out.push(category === 'module' ? `A key ${lang} module${local.length ? '' : ''}.` : `${ROLE[category] || 'A file'} (${lang}, ${lines} lines)`.replace(/\.\s\(/, ' (') + (category === 'module' ? '' : '.'));
    if (doc) out.push(doc);
    if (exports.length) out.push(`It defines ${list(exports, 4)}.`);
    if (pkgs.length) out.push(`Uses ${list(pkgs, 4)}${local.length ? ` plus ${local.length} local import${local.length > 1 ? 's' : ''}` : ''}.`);
    else if (local.length) out.push(`Pulls in ${list(local, 3)}.`);
  }
  return out.join(' ').replace(/\.\.(?=\s|$)/g, '.');
}

// Optional: polish captions with a local Ollama model. Falls back to the input.
export async function ollamaAvailable(host = 'http://localhost:11434') {
  try {
    const r = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch { return false; }
}

export async function polish(model, file, caption, snippet, host = 'http://localhost:11434') {
  const prompt = `You narrate a code tour. Rewrite this caption for the file ${file} as one or two plain, friendly sentences (max 45 words). Keep every fact, add nothing you cannot see. Reply with the caption only.\n\nCaption: ${caption}\n\nFirst lines of the file:\n${snippet.slice(0, 1500)}`;
  try {
    const r = await fetch(`${host}/api/generate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0.2 } }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) return caption;
    const text = clean((await r.json()).response || '');
    return text && text.length < 400 ? text : caption;
  } catch { return caption; }
}
