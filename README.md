# repo-tour

Point it at any repo and get a guided tour of its main files. repo-tour picks the README, the agent files (AGENTS.md, CLAUDE.md, GEMINI.md, `.claude/`, `.codex/`, Copilot or Cursor rules), config, entry points, the most-imported modules and CI. It writes a short caption for each file and outputs:

- `index.html`: a single self-contained page that steps through the files with highlighted code and captions. The CSS, data and highlighter are inline, so nothing is fetched when you open it.
- `tour.md`: the same tour in Markdown, ready to paste into a README.
- `tour.mp4` (optional, `--video`): a recording of the HTML tour stepping through the files.

No AI is needed. By default, captions come from the file type, imports, exports, docstrings, headings and package scripts. Use `--ollama <model>` to polish them through a local Ollama.

**Example:** [tour of mogesjohnson/BEST-OF-AI-DEV](https://mogesjohnson.github.io/repo-tour/examples/best-of-ai-dev/) (HTML on GitHub Pages), with [Markdown](examples/best-of-ai-dev/tour.md) and [video](examples/best-of-ai-dev/tour.mp4) versions.

## Use it

Needs Node 18 or newer. There are no dependencies.

```sh
git clone https://github.com/mogesjohnson/repo-tour
node repo-tour/bin/repo-tour.mjs path/to/some-repo --out some-repo-tour
# then open some-repo-tour/index.html
```

| Option | What it does |
| --- | --- |
| `--out <dir>` | Output folder (default `./tour`) |
| `--max <n>` | Most files in the tour (default 12) |
| `--lines <n>` | Most code lines per stop in the HTML (default 120) |
| `--name <name>` | Title (default: the git remote's `owner/repo`, or the folder name) |
| `--no-html`, `--no-md` | Skip one of the outputs |
| `--video` | Also record `tour.mp4` |
| `--seconds <n>` | Seconds per stop in the video (default 4) |
| `--ollama <model>` | Polish captions with a local Ollama model |

In the HTML tour, use the arrow keys or Prev/Next to move, link to a stop with `#3`, or add `?autoplay=5` to advance every 5 seconds.

### Video

`--video` follows the approach of [demo-reel](https://github.com/mogesjohnson/demo-reel). It opens the HTML tour in headless Chromium with Playwright's video recording, steps through each stop, and converts the recording to H.264 mp4 with ffmpeg. Both tools are optional and nothing is downloaded for you:

```sh
npm i playwright && npx playwright install chromium   # or playwright-core with Chrome installed
sudo apt install ffmpeg                               # or brew install ffmpeg
```

If either one is missing, repo-tour still writes the HTML and Markdown and tells you why it skipped the video. With `playwright-core`, it uses your installed Chrome.

### Ollama

`--ollama llama3.2` checks `http://localhost:11434` first. If Ollama answers, it rewrites each caption in plain words and keeps the facts. If it doesn't answer, or a request fails, the heuristic caption stays.

## How it picks files

1. The README, then every agent instruction file it finds.
2. Config: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Dockerfile`, `Makefile` and similar.
3. Entry points: `bin` and `main` from `package.json`, plus `main`, `index`, `cli`, `app` and `server` files near the top.
4. Key modules: source files ranked by how often other files import them, then by size. Tests, fixtures and examples are skipped.
5. The first GitHub Actions workflow.

Docs-only repos get one Markdown file from each top-level folder instead. `node_modules`, build output and files over 200 KB are skipped.

## Limits

- The picks and captions are heuristics, so check the tour before you publish it.
- The highlighter is a small regex one: good for reading, not a parser.
- The tour embeds the files' contents. Don't run it on a repo with secrets you won't publish.

## Example tour: BEST-OF-AI-DEV

Generated with `node bin/repo-tour.mjs ../BEST-OF-AI-DEV --out examples/best-of-ai-dev --video --seconds 3`. Open the [interactive HTML](https://mogesjohnson.github.io/repo-tour/examples/best-of-ai-dev/), read [tour.md](examples/best-of-ai-dev/tour.md), or watch [tour.mp4](examples/best-of-ai-dev/tour.mp4). The stops:

1. `README.md` (Overview)
2. `AGENTS.md` (Agent file)
3. `CLAUDE.md` (Agent file)
4. `GEMINI.md` (Agent file)
5. `.claude/settings.json` (Agent file)
6. `.codex/config.toml` (Agent file)
7. `package.json` (Config)
8. `template/scripts/check/commit-format.mjs` (Key module)
9. `site/src/components/ThemeToggle.tsx` (Key module)
10. `template/scripts/lib/git-env.mjs` (Key module)
11. `site/src/lib/site.ts` (Key module)
12. `.github/workflows/ci.yml` (CI)

License: MIT.
