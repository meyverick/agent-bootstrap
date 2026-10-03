# Chapter 1 — Core Commands

Self-contained reference. Read when driving the sem CLI from a terminal or script.

## `sem diff` — what changed?

```bash
sem diff                          # working tree changes (untracked excluded, like git)
sem diff --staged                 # staged only
sem diff --commit abc1234         # specific commit
sem diff --from HEAD~5 --to HEAD  # commit range
sem diff file1.ts file2.ts        # compare two files (no git needed)
sem diff --format json            # structured output
sem diff --format markdown        # for PRs / reports
sem diff -v                       # verbose: word-level inline diffs
sem diff --file-exts .py .rs      # filter by extension
```

Change types: `added`, `modified` (split into **structural** vs **cosmetic**),
`deleted`, `renamed`/`moved`.

## `sem impact` — blast radius

```bash
sem impact validateToken            # everything affected if this changes
sem impact validateToken --deps     # direct dependencies only
sem impact validateToken --dependents  # direct dependents only
sem impact validateToken --tests    # affected tests only
sem impact validateToken --json
sem impact validateToken --file src/auth.ts   # disambiguate same-name entities
```

Run before refactoring or deleting an entity to scope the work.

## `sem blame` — who last touched this?

```bash
sem blame src/auth.ts          # entity-level blame for a file
sem blame src/auth.ts:validateToken   # one entity (file:entity syntax)
```

Answers "who changed this function", not "who changed these lines".

## `sem log` — evolution and hotspots

```bash
sem log validateToken          # how one entity evolved through history
sem log                        # repo analytics: hotspots + co-change pairs
sem log --json
```

No-argument `log` = repository-level history analytics.

## `sem context` — token-budgeted entity context

```bash
sem context validateToken              # body + callers + callees
sem context validateToken --hops 2      # bound graph depth (1-2 = neighborhood)
sem context validateToken --json
```

## `sem entities` — list entities

```bash
sem entities                    # all in repo
sem entities src/auth.ts        # one file
sem entities --json
```

## `sem graph` — dependency graph

```bash
sem graph                       # full cross-file graph
sem graph src/                  # subtree
sem graph --format json
sem graph --file-exts .py .rs
```

For one entity's deps/dependents, prefer `sem impact` or `sem context`.

## Index-backed lookups: `find` / `callers` / `refs` / `grep`

```bash
sem find validateToken          # definitions by name (mmap query index, <10ms warm)
sem callers validateToken       # who calls it (reverse postings)
sem refs validateToken          # what it calls (forward postings)
sem grep "retry_policy"         # rg-compatible file:line:text (trigram index)
```

- First run on a large repo **builds the index** (cold, slower), leaves it behind —
  next calls are fast. Cold slowness is expected, not a hang.
- `sem grep` patterns are always regex; patterns with no usable trigram
  (`-i`, short literals) degrade to an honest full scan, never a wrong answer.

## Disambiguation & scope

- Same-name entities → add `--file <path>` (or `file:entity` syntax) to pin.
- Extension filtering: `--file-exts` on diff/graph.
- Untracked files: not in `sem diff` (git parity).

Next: Chapter 2 — [mcp.md](mcp.md).
