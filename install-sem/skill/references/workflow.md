# Chapter 3 — JSON Output & the Grep-Complement Workflow

Self-contained reference. Read when feeding sem output to another tool, or when deciding between grep and sem.

## JSON output

Every command accepts `--format json` (or `--json`). Prefer JSON whenever
output is parsed, piped, or passed to another tool.

```bash
sem diff --format json
sem impact validateToken --json
sem entities --json
```

`sem diff` JSON shape:

```json
{
  "summary": { "fileCount": 2, "added": 1, "modified": 1, "deleted": 1 },
  "changes": [
    {
      "entityId": "src/auth.ts::function::validateToken",
      "changeType": "modified",
      "entityType": "function",
      "entityName": "validateToken",
      "filePath": "src/auth.ts"
    }
  ]
}
```

- `entityId` is the stable identifier (`path::type::name`) — use it as the key
  when correlating across commands.
- `changeType` ∈ `added | modified | deleted | renamed` (a `modified` entry
  distinguishes structural from cosmetic in human output).
- Human formats: default terminal rendering, `--format markdown` for PR text.

## Grep-complement workflow

sem is **deterministic** — it resolves exact entities, it does not fuzzy-rank.
Locate a candidate with a cheap text pass, then hand the name to sem:

```bash
grep -rn "retry" src/        # 1) find where the concept appears (cheap, one pass)
sem context retry_handler    # 2) full body + callers + callees, by name
```

Or the MCP equivalent in one step: `sem_entities` with `query` (ranked search)
or `text` (entity-addressed grep, no file reads).

Decision table:

| Need | Tool |
|------|------|
| Find by exact/guessed name | `sem context <name>` (one call) or `sem find <name>` |
| Find by intent / free text | `sem_entities(query=...)` or `sem find` with query |
| Find a literal string (error text, config key) | `sem_grep(text=...)` or `sem grep "pattern"` |
| Read body + neighborhood | `sem context` (bound with `--hops 1-2`) |
| Whole-file/symbol scan semantics, regex nuance | plain `grep`/`rg` still fine |

## Ambiguity handling

- Ambiguous entity name → sem returns a candidate list (MCP) or asks for
  disambiguation (CLI `--file` / `file:entity`). Pick deliberately; never
  assume the first candidate.
- `sem grep` degrades honestly: no-trigram patterns → full scan (slower,
  correct), never a wrong fast answer.

## Token discipline

- Report entity ids/paths + one-line summaries; do not paste whole files
  unless asked.
- `sem context --hops 1` for tight neighborhoods; raise hops only when the
  graph question demands it.
- Use `--format json` + extraction over parsing human tables.

Next: Chapter 4 — [health.md](health.md).
