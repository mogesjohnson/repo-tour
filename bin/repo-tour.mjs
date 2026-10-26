#!/usr/bin/env node
// repo-tour: point it at a repo, get a guided tour of its main files.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pickFiles } from '../src/pick.mjs';
import { narrate, language, ollamaAvailable, polish } from '../src/narrate.mjs';
import { renderHtml, renderMarkdown } from '../src/render.mjs';

const HELP = `Usage: repo-tour [repo-dir] [options]

Picks a repo's main files (README, agent files, config, entry points, key
modules, CI), narrates each one and writes a tour.

Options:
  --out <dir>        Output folder (default: ./tour)
  --max <n>          Most files to include (default: 12)
  --lines <n>        Most code lines per stop in the HTML (default: 120)
  --name <name>      Name shown in the tour (default: git remote or folder name)
  --no-html          Skip index.html
  --no-md            Skip tour.md
  --video            Also record tour.mp4 (needs Playwright and ffmpeg)
  --seconds <n>      Seconds per stop in the video (default: 4)
  --ollama <model>   Polish captions with a local Ollama model if reachable
  -h, --help         Show this help`;

function parseArgs(argv) {
  const o = { dir: '.', out: 'tour', max: 12, lines: 120, html: true, md: true, video: false, seconds: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined) throw new Error(`${a} needs a value`); return v; };
    if (a === '-h' || a === '--help') o.help = true;
    else if (a === '--out') o.out = val();
    else if (a === '--max') o.max = Number(val());
    else if (a === '--lines') o.lines = Number(val());
    else if (a === '--name') o.name = val();
    else if (a === '--no-html') o.html = false;
    else if (a === '--no-md') o.md = false;
    else if (a === '--video') o.video = true;
    else if (a === '--seconds') o.seconds = Number(val());
    else if (a === '--ollama') o.ollama = val();
    else if (a.startsWith('-')) throw new Error(`Unknown option ${a}`);
    else o.dir = a;
  }
  if (!(o.max > 0) || !(o.lines > 0) || !(o.seconds > 0)) throw new Error('--max, --lines and --seconds must be positive numbers');
  return o;
}

function repoName(dir) {
  try {
    const url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = url.match(/[:/]([^/:]+\/[^/]+?)(\.git)?$/);
    if (m) return m[1];
  } catch { /* not a git repo */ }
  return path.basename(path.resolve(dir));
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log(HELP); return; }
  const root = path.resolve(o.dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`Not a folder: ${o.dir}`);
  const { picked, total } = pickFiles(root, { max: o.max });
  if (!picked.length) throw new Error('Found no files to tour');
  let useOllama = false;
  if (o.ollama) {
    useOllama = await ollamaAvailable();
    console.error(useOllama ? `ollama: polishing captions with ${o.ollama}` : 'ollama: not reachable at localhost:11434, using heuristic captions');
  }
  const steps = [];
  for (const p of picked) {
    const src = readFileSync(path.join(root, p.file), 'utf8').replace(/\r\n/g, '\n');
    let caption = narrate(p, src);
    if (useOllama) caption = await polish(o.ollama, p.file, caption, src);
    const lines = src.split('\n');
    const code = lines.slice(0, o.lines).join('\n') + (lines.length > o.lines ? `\n… ${lines.length - o.lines} more lines` : '');
    steps.push({ ...p, language: language(p.file), caption, code });
  }
  const tour = { name: o.name || repoName(root), total, steps };
  const out = path.resolve(o.out);
  mkdirSync(out, { recursive: true });
  const html = path.join(out, 'index.html');
  if (o.html || o.video) writeFileSync(html, renderHtml(tour));
  if (o.md) writeFileSync(path.join(out, 'tour.md'), renderMarkdown(tour));
  console.error(`repo-tour: ${steps.length} stops from ${total} files`);
  steps.forEach((s, i) => console.error(`  ${String(i + 1).padStart(2)}. ${s.category.padEnd(8)} ${s.file}`));
  if (o.html || o.video) console.error(`wrote ${path.relative(process.cwd(), html) || html}`);
  if (o.md) console.error(`wrote ${path.relative(process.cwd(), path.join(out, 'tour.md'))}`);
  if (o.video) {
    const { recordVideo } = await import('../src/video.mjs');
    const file = await recordVideo(html, path.join(out, 'tour.mp4'), { seconds: o.seconds });
    if (file) console.error(`wrote ${path.relative(process.cwd(), file)}`);
  }
}

main().catch((err) => { console.error(`repo-tour: ${err.message}`); process.exit(1); });
