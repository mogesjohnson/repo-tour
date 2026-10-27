// Optional --video: step through the HTML tour in a headless browser with
// Playwright's video recording, then convert the webm to mp4 with ffmpeg.
// Same approach as mogesjohnson/demo-reel. Never downloads anything.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdtempSync, renameSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

// Find playwright (or playwright-core) next to the tool, the target or the cwd.
export async function loadPlaywright() {
  const bases = [process.cwd(), path.dirname(fileURLToPath(import.meta.url))];
  for (const base of bases) {
    const req = createRequire(path.join(base, 'noop.js'));
    for (const name of ['playwright', 'playwright-core']) {
      try { return await import(pathToFileURL(req.resolve(name)).href); } catch { /* try next */ }
    }
  }
  return null;
}

async function launch(chromium) {
  try { return await chromium.launch(); } catch (err) {
    // Fall back to an installed Chrome when Playwright's own browser is missing.
    try { return await chromium.launch({ channel: 'chrome' }); } catch { throw err; }
  }
}

export async function recordVideo(htmlFile, mp4File, { seconds = 4, log = console.error } = {}) {
  const pw = await loadPlaywright();
  if (!pw) { log('video: skipped, Playwright is not installed (npm i playwright && npx playwright install chromium)'); return null; }
  if (!hasFfmpeg()) { log('video: skipped, ffmpeg is not on PATH'); return null; }
  const size = { width: 1280, height: 720 };
  const dir = mkdtempSync(path.join(tmpdir(), 'repo-tour-'));
  const browser = await launch(pw.chromium || pw.default.chromium);
  try {
    const ctx = await browser.newContext({ viewport: size, recordVideo: { dir, size } });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(htmlFile).href);
    await page.waitForFunction(() => window.tour);
    const count = await page.evaluate(() => window.tour.count);
    for (let n = 0; n < count; n++) {
      await page.evaluate((k) => window.tour.go(k), n);
      await sleep(seconds * 500);
      // Ease the code pane down a little so longer files show more than the top.
      for (let s = 0; s < 10; s++) { await page.evaluate(() => { document.querySelector('pre').scrollTop += 24; }); await sleep(seconds * 50); }
    }
    await sleep(600);
    await ctx.close();
  } finally { await browser.close(); }
  const webm = readdirSync(dir).find((f) => f.endsWith('.webm'));
  if (!webm) { log('video: no recording was produced'); return null; }
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, webm), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', mp4File], { encoding: 'utf8' });
  if (r.status !== 0) {
    const keep = mp4File.replace(/\.mp4$/, '.webm');
    renameSync(path.join(dir, webm), keep);
    log(`video: ffmpeg failed, kept ${keep}\n${(r.stderr || '').slice(-400)}`);
    return keep;
  }
  rmSync(dir, { recursive: true, force: true });
  return mp4File;
}
