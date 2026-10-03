# init-project

Agentic boilerplate bootstrap — one curl, any project, any machine. Installs/updates
the eight tool CLIs, writes committable project config (AGENTS.md directives, MCP
for pi + agy, skills), and runs the per-repo inits.

## Usage

```bash
cd your-project/
curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/init-project.ts | bun
```

Or from a local checkout (repo root): `bun init-project.ts`.

Re-running is always safe: every layer is idempotent (unchanged/skipped on success, exit 0).

## Repository layout

```
agent-bootstrap/            <- this repo (submodule of the private orchestrator)
├── init-project.ts          <- THE bootstrap (self-contained: all payloads embedded)
├── install-lsp/lsp.json     <- editable source of truth for the embedded 17-server
│                               LSP config (the script never reads it at runtime;
│                               to change it: edit this file, then re-embed into
│                               the LSP_CONFIG const in init-project.ts)
├── install-<app>/           <- per-app reference installers + templates + skills
└── README.md
```

Path convention: every path in the OpenSpec specs and docs is **relative to this
repository root** (e.g. `./install-headroom/mcp.json` = `install-headroom/mcp.json`
here).

## What it does (in order)

| Layer | Writes | When |
|-------|--------|------|
| 1. Machine | tool CLIs only (npm/uv global packages) — **never** `~/` dotfiles; plus LSP bins: 11 npm-able auto-installed, 6 toolchain-gated reported | every run (update checks are read-only, offline-tolerant) |
| 2. Project MCP + LSP | `.pi/mcp.json` + `.agents/mcp_config.json` (8 servers, **env-ref credentials**) AND `.pi/lsp.json` + `.antigravity/lsp.json` (full 17-server LSP config) | first run + converges |
| 3. Project rules | `AGENTS.md` — 8 balise activation blocks (re-run replaces only our blocks) | first run + converges |
| 4. Project skills | `.agents/skills/<app>/` (35 files across 8 apps) | first run + converges |
| 5. Repo inits | `graft build`, `qmd init .`, `codegraph init` | only when `graft/` / `.qmd` / `.codegraph` is absent |

Machine layer covers: `qmd` · `sem` · `graft` · `codegraph` (npm, per-app update
semantics) · `headroom` (uv) · `jcodemunch` (uvx gate) · `context7` + `jev`
(node/npx gates). Destructive/config-writing subcommands are structurally
unreachable (spawn allowlists).

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

Layer 1 ensures the server binaries from the embedded config. npm-able set
(auto-install when the bin is missing — bin ← package, 10 packages):

| Bin | npm package |
|-----|-------------|
| `typescript-language-server` | `typescript-language-server` |
| `svelteserver` | `svelte-language-server` |
| `vscode-json-languageserver` | `vscode-langservers-extracted` |
| `vscode-html-language-server` | `vscode-langservers-extracted` |
| `yaml-language-server` | `yaml-language-server` |
| `gh-actions-language-server` | `gh-actions-language-server` |
| `tailwindcss-language-server` | `tailwindcss-language-server` |
| `sql-language-server` | `sql-language-server` |
| `biome` | `@biomejs/biome` |
| `docker-langserver` | `dockerfile-language-server-nodejs` |
| `bash-language-server` | `bash-language-server` |

Toolchain-gated set (reported with the exact command, never auto-run):

| Bin | Install with |
|-----|--------------|
| `rust-analyzer`, `marksman`, `taplo`, `buf` | `brew install rust-analyzer marksman taplo buf` |
| `protols` | `cargo install protols` |
| `csharp-ls` | `dotnet tool install --global csharp-ls` |

Layer 2 writes the full 17-server config to BOTH:

- `./.pi/lsp.json` — pi-lsp native project path. **First session will prompt you to
  trust the project LSP config** (sha256 + binary list pinned) — approve once per
  project to activate.
- `./.antigravity/lsp.json` — agy path (see verify-later below).

Merge: per-server-id template-wins; any extra server entries you add yourself are
preserved. Zero secrets — globs, bins, and settings only.

## Security note (curl | bun)

The one-liner executes a remote script. Use HTTPS and, for reproducibility,
pin a tag instead of `main`:

```bash
curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/v1.0.0/init-project.ts | bun
```

The script only spawns package managers/CLIs and reads/writes inside the
current project tree.

## Verify later (agy)

Two assumptions to confirm on a real agy session:

1. agy reads `./.agents/mcp_config.json` as project MCP config **and** expands
   `${VAR}` in `env`/`headers` like pi does
2. agy reads `./.antigravity/lsp.json` for LSP servers

Until verified: pi paths are proven; the agy paths are written anyway (best-effort,
harmless if ignored).
