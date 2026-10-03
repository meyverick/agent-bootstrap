# Chapter 3 — Concepts & Setup

Self-contained reference. Read for the graph model, cache/wiring boundaries, per-project setup, and scope limits.

## The graph as markdown

Graft parses code and writes `graft/` — small linked markdown nodes, one per
system/API/concept, each explaining a part in prose and naming exact `file:line`
spans, plus a wiring graph of who-calls-what.

- Querying a node = a few hundred tokens; rebuilding that understanding by
  reading source = thousands, and misses the edges.
- No database, no server, no daemon — the graph is just files.
- Built from your code locally; **no API key** for any command.

## `graft/` is a local cache, like `node_modules`

- `graft build` writes `graft/` and adds it to `.gitignore` — regenerable,
  per-clone, never committed.
- What a team commits is the *wiring* that setup drops (agent config), not the
  graph itself; each teammate runs their own build.
- In this workspace convention: `/graft/` is ignored at repo root.

## Per-project setup is a USER action

`graft init` wires a repo into coding agents: it prompts for which agents,
writes instruction-file sections/skills, optionally drops hooks (post-edit
blast-radius warnings + automatic graph re-sync) and a statusline, then builds.

- **Never run `init`/`build`/`uninstall` from agent flows unprompted** — they
  mutate the repo (graph dir, `.gitignore`, agent config files). Offer them;
  the user decides. The installer script enforces the same rule structurally
  (spawn allowlist: `--version`/`version`/`upgrade` only).
- `graft uninstall` is the inverse of init (`--keep-cache` keeps graph + ignore
  entry). User-driven.

## Freshness model

The graph is built once and refreshed by explicit rebuild (or post-edit hooks
when the user enabled them). Between builds it can drift from the code:

- Check freshness when answers look inconsistent with files you can see.
- Report drift + recommend rebuild; the rebuild itself is the user's call.

## When NOT to use graft

- **No `graft/` graph present** → fallback: grep/source reads (syllabus).
- **Files graft doesn't index** (docs, configs, brand-new uncommitted files) →
  raw `grep -rn` is correct.
- **Non-code knowledge** (notes, wikis, specs) → dedicated local-search tools.
- **Trivial one-file reads** where opening the file is cheaper than graph query.

## Telemetry (opt-out, local-first)

Anonymous usage events only — appended locally, posted at most once a day by a
detached process; **no command ever waits on the network**. Contract is a hard
allowlist in source (`TELEMETRY.md` upstream); nothing from your code or
secrets is sent. Disable per upstream docs if required by policy.

## Cost discipline

- One tool per task; `ask --source` inlines the crux so most answers need no
  follow-up read.
- Prefer `skeleton` over reading whole files; prefer `callers --depth 2` over
  manual import tracing.
- `map` once per unfamiliar area, not per question.

Next: back to the syllabus — [../SKILL.md](../SKILL.md).
