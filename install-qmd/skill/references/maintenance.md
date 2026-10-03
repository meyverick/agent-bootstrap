# Chapter 5 — Setup, Health & Maintenance

Self-contained reference. Read when installing qmd, bootstrapping an index, embedding, or diagnosing failures.

## Install

```bash
npm install -g @tobilu/qmd     # Node or Bun: bun install -g @tobilu/qmd
npx @tobilu/qmd ...            # run without installing
```

Cross-platform: bin launches under Node, falls back to Bun. No system deps beyond that.

## Index bootstrap

```bash
qmd init          # create project-local .qmd/ (index.yml + index.sqlite) in CWD
```

- Refuses to run in `$HOME` (global index is implicit there — use `collection add`).
- Existing `.qmd/` → re-run is safe; config preserved.
- Checked-in `.qmd/` from another machine → `qmd trust` (approve hooks/paths/models),
  `qmd trust list` / `qmd trust revoke`.

## Update & embed (mutating — only on explicit request)

```bash
qmd update            # re-index collections
qmd update --pull     # git pull collections first, then re-index
qmd embed             # generate/refresh vector embeddings
qmd embed -f          # force refresh
qmd embed -c <name>   # one collection only
qmd embed --max-docs-per-batch <n> --max-batch-mb <n>   # memory caps
qmd embed --timeout <minutes>                           # session cap (default 30, 0 = none)
qmd pull              # download embedding/generation/rerank models
qmd cleanup [--dry-run]  # drop inactive docs/orphans, FTS compact, vacuum
```

Cost warning: `embed` runs local model inference — batches are capped but large
corpora take time. `--dry-run` first for `cleanup`.

## Health & diagnostics

```bash
qmd status     # index + collection health, MCP daemon state
qmd doctor     # config, model cache, device/GPU, vector fingerprints, env overrides
qmd collection list
```

**Order of operations on any model-backed failure:** `qmd doctor` first, then change
nothing until its output is read. It checks what `query`/`vsearch` need.

## Environment knobs

- `QMD_FORCE_CPU=1` (or `0/off/none/false`) — force CPU inference.
- `QMD_LLAMA_GPU` — GPU mode (`auto` default unless force-CPU set).

Reported by `status` as `CPU forced` / `auto (N×GPU)` style labels.

## Failure matrix

| Symptom | First action | Fallback |
|---------|--------------|----------|
| `qmd query`/`vsearch` fails | `qmd doctor` | `qmd search` with stronger `lex:` terms |
| Empty results | check collection scope (`-c`), `qmd ls` | broaden query, verify index fresh (`qmd status`) |
| Filter returns fewer than expected | `qmd collection metadata` coverage header | add `exists: false` branch (Chapter 3) |
| Slow embed | lower `--max-docs-per-batch`/`--max-batch-mb`, `-c` subset | raise `--timeout` |
| Index behaves stale | `qmd update` | `qmd cleanup --dry-run` then real |
| `.qmd/` from another machine rejected | `qmd trust` | `qmd trust list` to inspect |
| MCP not connecting | `qmd status` (daemon), config shape (Chapter 4) | restart `qmd mcp`, check `mcpServers` root key |

## Anti-patterns

- Mutating indexes (`collection add`/`update`/`embed`/`cleanup`) without explicit user request.
- Skipping `doctor` and editing config blind.
- Running production `embed` on unbounded batches (OOM risk) instead of using the caps.
