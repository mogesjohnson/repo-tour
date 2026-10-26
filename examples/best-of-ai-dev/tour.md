# Tour of mogesjohnson/BEST-OF-AI-DEV

12 stops, picked from 117 files by [repo-tour](https://github.com/mogesjohnson/repo-tour).

## 1. `README.md` (Overview)

Start here: the README introduces **BEST OF AI DEV**. Moges Johnson's template and source of truth for AI-first development: the practices worth keeping, drop-in agent rules for every new repo, and a docs site on why each practice matters. Sections include `What's here`, `Use it`, `Run the docs site`, `Known gaps` and 1 more.

```md
# BEST OF AI DEV

Moges Johnson's template and source of truth for AI-first development: the practices worth
keeping, drop-in agent rules for every new repo, and a docs site on why each practice matters.

**Docs site: https://mogesjohnson.github.io/BEST-OF-AI-DEV/** (built from [`site/`](site), deployed
to GitHub Pages on every push to `main`).

Most of this repo was written by a coding agent through small, self-reviewed pull requests,
under the rules it ships. The repo holds itself to the same template it offers, and the gaps
are listed below instead of hidden.

```

<sub>First 12 of 95 lines.</sub>

## 2. `AGENTS.md` (Agent file)

Instructions for AI coding agents working in this repo. BEST-OF-AI-DEV is Moges Johnson's template repo for AI-first development: drop-in agent rules and checks in template/, the reasoning in practices/, and a docs site in site/. It follows its own template. Sections include `What this repo is`, `Commands`, `Where things live`, `How work flows` and 3 more.

```md
# AGENTS.md

<!-- BEST-OF-AI-DEV template v1. Canonical rules for every agent and human in this repo.
     CLAUDE.md, GEMINI.md and any other vendor file point here and add nothing else.
     Keep this file at or under 70 lines. Long detail goes in RULES.md or docs/. -->

## What this repo is

<!-- REPO-SPECIFIC: one or two sentences. What it does, who uses it, current version. -->
BEST-OF-AI-DEV is Moges Johnson's template repo for AI-first development: drop-in agent rules
and checks in `template/`, the reasoning in `practices/`, and a docs site in `site/`. It follows its own template.
<!-- /REPO-SPECIFIC -->
```

<sub>First 12 of 71 lines.</sub>

## 3. `CLAUDE.md` (Agent file)

Instructions for AI coding agents working in this repo. It imports `AGENTS.md` instead of repeating its rules.

```md
@AGENTS.md

<!-- BEST-OF-AI-DEV template v1. Claude Code reads CLAUDE.md, not AGENTS.md, so this file
     imports it. Add nothing here that other agents also need: put it in AGENTS.md.
     Grok Build reads both files in the same directory, so a duplicate here is loaded twice. -->

```

## 4. `GEMINI.md` (Agent file)

Instructions for AI coding agents working in this repo. It imports `AGENTS.md` instead of repeating its rules.

```md
@AGENTS.md

<!-- BEST-OF-AI-DEV template v1. Gemini CLI reads GEMINI.md by default.
     Antigravity reads AGENTS.md itself and treats the line above as a path reference.
     This file imports AGENTS.md and must not grow its own rules.
     Alternative: set "contextFileName": "AGENTS.md" in .gemini/settings.json and delete this file. -->

```

## 5. `.claude/settings.json` (Agent file)

JSON settings with top-level keys `$schema` and `permissions`.

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm test)",
      "Bash(npm test *)",
      "Bash(npm run lint)",
      "Bash(npm run lint *)",
      "Bash(npm run typecheck)",
      "Bash(npm run build)",
      "Bash(npm run check:size)",
      "Bash(node scripts/check/*)",
```

<sub>First 12 of 105 lines.</sub>

## 6. `.codex/config.toml` (Agent file)

Instructions for AI coding agents working in this repo (TOML, 25 lines). BEST-OF-AI-DEV template v1. Project config for Codex. Codex reads this file only after you trust the project; until then your user config applies. It cannot set providers, profiles, notify or telemetry: those stay in…

```toml
# BEST-OF-AI-DEV template v1. Project config for Codex.
# Codex reads this file only after you trust the project; until then your user config applies.
# It cannot set providers, profiles, notify or telemetry: those stay in ~/.codex/config.toml.

# Ask before leaving the sandbox. "never" is for CI or `codex exec` in a throwaway container.
approval_policy = "on-request"

# Write inside the repo only. danger-full-access is never a project default.
sandbox_mode = "workspace-write"

# Web search reads a cached index, not the live web. Prompt injection rides in on live pages.
web_search = "cached"
```

<sub>First 12 of 25 lines.</sub>

## 7. `package.json` (Config)

Defines the `best-of-ai-dev` package: Moges Johnson's template and source of truth for AI-first development. Scripts: `prepare`, `test`, `check:size` and `test:windows`. It has no dependencies.

```json
{
  "name": "best-of-ai-dev",
  "private": true,
  "type": "module",
  "description": "Moges Johnson's template and source of truth for AI-first development.",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "prepare": "node template/scripts/setup-hooks.mjs",
    "test": "node template/scripts/test/run.mjs && node template/scripts/check/template-sync.mjs --skip scripts/",
    "check:size": "node template/scripts/check/pr-size.mjs",
```

<sub>First 12 of 16 lines.</sub>

## 8. `template/scripts/check/commit-format.mjs` (Key module)

A key JavaScript module. BEST-OF-AI-DEV template v1. Commit message rules, shared by the commit-msg hook and CI. Format: Conventional Commits. "type(scope)!: subject", at most 72 characters. Type and scope are lowercase: "fix(api/auth): ..",… It defines `TYPES`, `MAX_SUBJECT`, `EXEMPT`, `PR_EXEMPT` and 4 more.

```js
// BEST-OF-AI-DEV template v1. Commit message rules, shared by the commit-msg hook and CI.
// Format: Conventional Commits. "type(scope)!: subject", at most 72 characters.
// Type and scope are lowercase: "fix(api/auth): ...", not "Fix(API): ...".
// Link issues with a "Refs: #12" footer. Closing keywords are banned: issues close on
// human acceptance, not on merge (RULES.md R7).

export const TYPES = ['feat', 'fix', 'docs', 'test', 'refactor', 'perf', 'build', 'ci', 'chore', 'revert', 'style'];
export const MAX_SUBJECT = 72;

const SUBJECT = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9][a-z0-9._/-]*\\))?!?: \\S`);
// Local hook: git's own merge, revert and autosquash subjects are fine while you work.
export const EXEMPT = /^(Merge |Revert "|fixup! |squash! |amend! )/;
```

<sub>First 12 of 71 lines.</sub>

## 9. `site/src/components/ThemeToggle.tsx` (Key module)

A key React TSX module. It defines `THEME_KEY`, `THEME_SCRIPT` and `ThemeToggle`. Uses `react` and `lucide-react`.

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "bod-theme";

/** Sets html[data-theme] before first paint. Dark unless the reader chose light. */
export const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem("${THEME_KEY}")==="light"?"light":"dark"}catch(e){}`;

type Theme = "dark" | "light";

```

<sub>First 12 of 41 lines.</sub>

## 10. `template/scripts/lib/git-env.mjs` (Key module)

A key JavaScript module. BEST-OF-AI-DEV template v1. Environment hygiene for anything that spawns git. Git exports GITDIR, GITINDEXFILE, GITWORKTREE and friends to hooks. A hook in a linked worktree gets GITDIR pointing at that worktree. Any… It defines `withoutGitEnv`.

```js
// BEST-OF-AI-DEV template v1. Environment hygiene for anything that spawns git.
//
// Git exports GIT_DIR, GIT_INDEX_FILE, GIT_WORK_TREE and friends to hooks. A hook in a
// linked worktree gets GIT_DIR pointing at that worktree. Any child that runs git
// somewhere else (a test's throwaway repo, a build step) silently operates on the REAL
// repo instead: "git init" + "git config" set core.bare and user.name on it, and
// "git switch" moves the worktree. Strip them for every child that does not need them.
// This also drops GIT_SSH_COMMAND, GIT_ASKPASS and GIT_CONFIG_*; a check that needs
// them must set them itself or be marked gitEnv: true in hooks/run-checks.mjs.

/** A copy of env without any GIT_* variable. */
export function withoutGitEnv(env = process.env) {
```

<sub>First 12 of 19 lines.</sub>

## 11. `site/src/lib/site.ts` (Key module)

A key TypeScript module. Shared by server pages and client components, so nothing here may import node modules. It defines `REPO_URL`, `hrefOf`, `sourceOf`, `GROUPS` and 1 more.

```ts
// Shared by server pages and client components, so nothing here may import node modules.

export const REPO_URL = "https://github.com/mogesjohnson/BEST-OF-AI-DEV";
export const hrefOf = (slug: string) => (slug ? `/why/${slug}/` : "/");
export const sourceOf = (file: string) => `${REPO_URL}/blob/main/docs/why/${file}`;

/** Group order in the sidebar. A page whose group is not listed goes last. */
export const GROUPS = ["Start here", "Change and review", "Rules and context", "Verification", "Operations"];

/** What the client shell needs for the sidebar: no HTML. */
export type NavEntry = { slug: string; title: string; summary: string; group: string };

```

## 12. `.github/workflows/ci.yml` (CI)

CI workflow "ci" that runs on `push` and `workflow_dispatch` with job `verify`.

```yaml
# BEST-OF-AI-DEV template v1. Cheap CI: one Linux job, cancelled when superseded.
# Do NOT make this workflow a required check: paths-ignore skips it for docs-only PRs,
# and a skipped required workflow leaves the PR pending forever. Require pr-checks instead.
# Other OSes run on demand (Actions > ci > Run workflow), not on every push.
name: ci

on:
  pull_request:
    paths-ignore: ['**/*.md', 'docs/**', '.github/ISSUE_TEMPLATE/**']
  push:
    branches: [main]
    paths-ignore: ['**/*.md', 'docs/**', '.github/ISSUE_TEMPLATE/**']
```

<sub>First 12 of 43 lines.</sub>
