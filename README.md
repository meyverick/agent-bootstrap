# init-project

Agentic boilerplate bootstrap — one curl, any project, any machine. Installs/updates
the eight tool CLIs, writes committable project config (AGENTS.md directives, MCP
for pi + agy, skills), and runs the per-repo inits.

## Usage

```bash
curl -fsSL https://raw.githubusercontent.com/meyverick/agent-bootstrap/main/install.ts | bun -
```

Or from a local checkout (repo root): `bun install.ts`.

Prerequisites: **Bun, curl, git** — everything else is provisioned by the
bootstrap itself, user-scope, on first run: uv, Node 22 LTS (→ npm/npx),
rustup (→ cargo/rust-analyzer), .NET SDK (→ dotnet tools). Installs land in
`~/.local`, `~/.cargo`, `~/.dotnet`; their own installers hook your shell
profiles — restart the terminal afterwards so *future* shells see them
(this run already works via in-process PATH).

Re-running is always safe: every layer is idempotent (unchanged/skipped on success, exit 0).

### Flags

| Flag | Effect |
|---|---|
| *(none)* | **Default**: our entries are updated, missing ones added, yours kept. Nothing is deleted except bootstrap-owned skill directories the kit no longer ships. |
| `--prune` | **Full install of our surfaces**: `AGENTS.md` := rule book (prose outside our blocks is dropped), `servers` / `mcpServers` / `packages` / lens managed keys (`lsp.serverOverrides`, `lsp.servers`, `format`, `autofix`) := exactly ours (extra entries dropped, one log line each), every removed `AGENTS.md` line counted. Sibling keys outside those managed keys survive; skill convergence is identical in both modes. |

Unknown flags are ignored — the script is also invoked by other tooling.

## Repository layout

```
agent-bootstrap/            <- this repo (submodule of the private orchestrator)
├── install.ts               <- THE bootstrap (self-contained: all payloads embedded)
├── install-lsp/               <- RETIRED by replace-pi-lsp-with-pi-lens (bin ensure
│                               stays in install.ts; pi-lens owns LSP config)
├── install-<app>/           <- per-app reference installers + templates + skills
├── install-agents/          <- base source (foundation, deployed by install.ts):
│   ├── AGENTS.md            <- the universal rule book, currently INERT —
│   │                            install.ts never reads it; balise region owned
│   │                            by the upsert, not this file
│   ├── skill-check/         <- always-shipped skill (direct refs in AGENTS.md)
│   ├── skill-guardrails/    <- always-shipped skill (direct refs in AGENTS.md)
│   └── scripts/
│       └── check-deps.ts    <- dev utility: dependency freshness report
│                                (bun scripts/check-deps.ts [dir] [--json]) —
│                                deployed to the consumer's ./scripts/ by the
│                                foundation layer; never referenced by
│                                AGENTS.md (developer tool, not an agent rule)
└── README.md
```

Path convention: every path in the OpenSpec specs and docs is **relative to this
repository root** (e.g. `./install-headroom/mcp.json` = `install-headroom/mcp.json`
here).

## What it does (in order)

| Layer | Writes | When |
|-------|--------|------|
| 0. Foundation | embedded rule-book base → `./AGENTS.md` (**written only when the file is absent, or on `--prune`**; otherwise the book region is preserved byte-for-byte) + upgrade cleanup (stale manifest, dropped skills) + `./scripts/check-deps.ts` + `openspec/reports/` | FIRST — before every other step, every run; **zero agentic/bunx** |
| 1. Machine | **self-provisions prerequisites** (uv · Node 22 LTS · rustup · .NET SDK — user-scope, in-process PATH) then tool CLIs (npm/uv global packages) — **never** `~/` dotfile configs; LSP bins: **18/18 auto** (12 npm + 6 toolchain channels) | every run (update checks are read-only, offline-tolerant) |
| 1c. Caveman runtime | `@caveman-ai/cli` via npm (install when absent, registry update check) then one non-interactive `caveman setup --install` per run, which verifies signatures + per-artifact checksums and syncs the tool's own binary directory (4 required + 2 optional binaries). User-scope, **no skills, no agent wiring, no `~/` pi writes** — the pi surface stays the workspace package. Runtime-install failure is a warning, never a failed run. Manual recovery: `npm i -g @caveman-ai/cli && caveman setup --install` | every run (installer short-circuits on a verified local install) |
| 1b. openspec profile | `~/.config/openspec/config.json` — canonical 3 keys merged, everything else preserved, **zero secrets** | every run + converges |
| 2. Project MCP + lens | `.pi/mcp.json` + `.agents/mcp_config.json` (10 servers, **env-ref credentials** where applicable — `benzi` carries none: auth lives in its own `~/.benzi/config.json`; `pi-lens` carries none: stdio transport) AND `.pi-lens.json` (report-only `format`/`autofix` off, `lsp.serverOverrides` rust+json, 3 custom `servers` buf/protols/tailwindcss) | first run + converges |
| 2b. Project Pi packages | `.pi/settings.json` — `packages[]` from `install-pi-extensions/extensions.json`, merged **workspace-only** (template-wins for declared packages so version bumps propagate; foreign packages + sibling keys kept; `--prune` resets `packages` to ours. No `pi` spawn, never `~/.pi`) + hint: grant project trust on the first pi session to load them | every run + converges. The caveman extension's own runtime is provisioned by layer 1c — the package alone loads but stays in direct mode |
| 3. Project rules | `AGENTS.md` — foundation base + our 10 balise activation blocks appended on top (base = `install-agents/AGENTS.md`, created once then preserved; `--prune` reinstalls it; balise region re-appended after — byte-stable) | every run (blocks rewrite; base only on create / `--prune`) |
| 4. Project skills | `.agents/skills/` — 23 deployed skills (9 tool + 14 ours: kit 5, openspec-extra 6, extra-skills 3; 133 files incl. 23 `.agent-bootstrap` ownership markers, no evals/transcripts) = 23 disjoint dirs. **Whole-tree convergence**: any drift (changed file, missing/extra file, missing marker) replaces the entire skill dir; a marker-bearing dir absent from the payload is deleted as stale; unmarked (foreign) dirs are never read or touched | every run + converges |
| 5. Repo inits | `graft build`, `qmd init .` + **qmd collections seeded** (6 from `default-db.json` — wikis/llms/openspec/references/directives/skills, skip-by-name) + `qmd update`, `codegraph init` — marker-gated; **`openspec init --tools agents --force` — EVERY run (no marker, user's canonical command)** | gated ones only when `graft/` / `.qmd` / `.codegraph` is absent; openspec always; **re-run `qmd update` after skill-changing runs to refresh the skills collection** |

Machine layer covers: `qmd` · `sem` · `graft` · `codegraph` · `openspec` (npm, per-app update
semantics) · `headroom` · `benzi` (uv, PyPI compare + `uv tool upgrade`; the installer never
spawns `benzi-mcp`/`benzi-login`/`benzi-headless`) · `jcodemunch` (uvx gate) · `context7` + `jev`
(node/npx gates). Destructive/config-writing subcommands are structurally
unreachable (spawn allowlists) — including openspec's interactive
`update` upgrade offer, which is never spawned.

`benzi` auth is a one-time **user** action: run `benzi-login` (interactive email
code → `~/.benzi/config.json`, BYOK model keys) before MCP use. The installer
never spawns it and never writes credentials into the project.

## AGENTS.md ownership

- **Base** = `install-agents/AGENTS.md` (this repo's rule book): the foundation layer
  writes it when `AGENTS.md` is absent and reinstalls it on `--prune`. A default run
  leaves the book region byte-for-byte alone.
- **Balise region** = ours: the 9 `<!-- <app>:start -->…<!-- <app>:end -->`
  blocks are re-appended after the base each run — byte-stable convergence.
- **Human edits** belong inside a balise block, or upstream to
  this repository's `install-agents/AGENTS.md` (the base's source of truth). `--prune`
  overwrites everything outside our blocks, so keep prose out of a project copy if you
  run it.

## Global openspec profile

The bootstrap ensures openspec's canonical profile in the file reported by
`openspec config path` (the **first deliberate `~/` exception** — openspec's
config scope is global-only; same class as npm globals, zero secrets):

| Key | Value |
|-----|-------|
| `profile` | `custom` |
| `delivery` | `skills` |
| `workflows` | `propose, explore, new, continue, apply, update, ff, sync, archive, bulk-archive, verify, onboard` (12) |

This is the non-interactive equivalent of running `openspec config profile` to
enable the expanded ("extra") skill set on a fresh machine; `init` then
materializes the skill files per this config. **No skill, no AGENTS.md block, and
no MCP config are authored for openspec** — upstream's `delivery: skills` owns
the skill layer, and openspec has no server. The ten balise blocks stay ten.

## Required environment variables

`.pi/mcp.json` and `.agents/mcp_config.json` reference credentials via `${VAR}` —
set these in the environment that launches your agent host:

| Variable | Used by | Where to get | Format |
|----------|---------|--------------|--------|
| `TYPESAFE_API_KEY` | jev-mcp (`jev` server) | https://console.typesafe.ai/settings/keys | raw key value |
| `CONTEXT7_API_KEY` | context7 (`context7` server header) | https://context7.com/dashboard | raw key, **without** the `Bearer ` prefix (the config prepends it) |

No key is ever written into a project file — only `${VAR}` references. If a
variable is unset at runtime, that server fails closed until you set it; the
other six servers are unaffected.

## LSP: 17 language servers

Layer 1 ensures the server binaries from the embedded config — target **18/18, zero manual steps**. npm-able set
(auto-install when the bin is missing — bin ← package(s), 12 packages):

| Bin | npm package |
|-----|-------------|
| `typescript-language-server` | `typescript-language-server` + `typescript` (companion: the server reports no valid installation without its compiler) |
| `svelteserver` | `svelte-language-server` |
| `vscode-json-language-server` | `vscode-langservers-extracted` |
| `vscode-html-language-server` | `vscode-langservers-extracted` |
| `yaml-language-server` | `yaml-language-server` |
| `gh-actions-language-server` | `gh-actions-language-server` |
| `tailwindcss-language-server` | `tailwindcss-language-server` |
| `biome` | `@biomejs/biome` |
| `docker-langserver` | `dockerfile-language-server-nodejs` |
| `bash-language-server` | `bash-language-server` |
| `buf` | `@bufbuild/buf` |
| `pyright-langserver` | `pyright` |

Toolchain-channel set (owning toolchain provisioned user-scope first, only if absent —
brew is never spawned):

| Bin | Channel |
|-----|---------|
| `rust-analyzer` | `rustup component add` (rustup provisioned if missing) |
| `protols` | `cargo install` (via the rustup toolchain) |
| `taplo` | `cargo install taplo-cli` (via the rustup toolchain; the npm dist lacks the LSP feature) |
| `marksman` | official GitHub release binary → `~/.local/bin` |
| `csharp-ls` | `dotnet tool install -g` (.NET SDK provisioned if missing) |
| `ruff` | `uv tool install` with bound `ruff<0.16.10` (uv provisioned if missing; 0.16.10's server fails to start — last good 0.16.9, revisit on upstream fix) |

A channel failure warns with verbatim output, the run continues, and the
config is still written.

Layer 2 writes the full 18-server config to BOTH:

- `./.pi-lens.json` — pi-lens project config (report-only, rust/json overrides,
  buf/protols/tailwindcss custom servers). Stale `./.pi/lsp.json` /
  `./.antigravity/lsp.json` files on disk are left untouched, never written.

## Global pi-lens preference

The widget switch is global-only, so the bootstrap also ensures
`widget.visible: false` in the machine-global pi-lens config
(`~/.pi-lens/config.json`, `%USERPROFILE%\.pi-lens\config.json` on Windows,
`PI_LENS_CONFIG_PATH` wins when set) — the **second deliberate `~/` exception**.
Parse-or-create, that key only, everything else preserved, write-only-on-change;
any failure warns and continues without failing the run. A project
`./.pi-lens.json` cannot carry this key (pi-lens warns and ignores it there).

Merge: per-server-id template-wins; any extra server entries you add yourself are
preserved. Zero secrets — globs, bins, and settings only.

## Security note (curl | bun)

The one-liner executes a remote script. Use HTTPS and, for reproducibility,
pin a tag instead of `main`:

```bash
curl -fsSL https://raw.githubusercontent.com/meyverick/agent-bootstrap/v1.0.0/install.ts | bun
```

The script only spawns package managers/CLIs and reads/writes inside the
current project tree.

## Verify-later status (agy)

**Confirmed (2026-10-03):** agy reads `./.agents/mcp_config.json` as project MCP
config **and** expands `${VAR}` in `env`/`headers` like pi does — verified on a
real agy session.

**Retired:** the agy `./.antigravity/lsp.json` path is no longer written — pi-lens
owns LSP and agy has no pi-lens equivalent. Stale files on disk are left untouched.
