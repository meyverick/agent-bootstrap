# Chapter 2 — Index Lifecycle & Freshness

Self-contained reference. Read for how the index is built, kept fresh, and repaired.

## Per-repo index = USER action

`codegraph init [path]` builds `.codegraph/` **inside the repo** and is the one
per-project setup step (global `codegraph install` agent wiring is separate and
also user-run).

- Because it writes repo files, agents **offer** it, never execute it: "this
  repo has no `.codegraph/` index — want me to run `codegraph init`?"
- One init per project; afterwards the freshness machinery takes over.
- `codegraph uninit` deletes `.codegraph/` (user-only, destructive).
- `codegraph index` = full rebuild; `codegraph sync` = incremental catch-up —
  both normally user-run or daemon-driven.

## Three freshness layers (why stale windows are small)

1. **Watch daemon** — background sync keeps the index tracking edits.
2. **Per-file staleness banner** — during the debounce window, any tool response
   referencing a still-pending file prepends `⚠️ <file>` telling you to `Read`
   the file directly for live content. Unreferenced pending files surface as a
   small footer instead. **Always obey the banner** — it is the explicit signal
   that the index is briefly behind for that file.
3. **Connect-time catch-up** — on MCP (re)connect, the server reconciles via
   `(size, mtime)` + content-hash before answering the first query, absorbing
   edits made while no server ran (terminal `git pull`, other editors, previous
   sessions). First call after reconnect may take a moment — expected.

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| No index / empty answers | `.codegraph/` absent | user runs `codegraph init` |
| Response prefixed `⚠️` | file pending sync | `Read` that file directly, per banner |
| Answers miss recent terminal edits | server not running since the edit | next connect-time catch-up absorbs it; or user runs `codegraph sync` |
| Lock blocking indexing | crashed prior run | user: `codegraph unlock <path>` |
| Seriously divergent index | drift beyond sync | user: `codegraph index` full rebuild |

## State queries

- `codegraph_status` / `codegraph status` — index status + statistics; use as
  the precondition probe before first use in a repo.
- `codegraph daemon` — interactive manager for background daemons (user-run;
  not an agent action).

Next: Chapter 3 — [concepts.md](concepts.md).
