# Chapter 1 — Search Modes & Query Craft

Self-contained reference. Read when choosing how to search or composing a query.

## The three modes

| Mode | Backend | Use when | Cost |
|------|---------|----------|------|
| `qmd search "<terms>"` | BM25 lexical | exact words, titles, names, code symbols, rare phrases | fast, no model |
| `qmd vsearch "<text>"` | vector | paraphrased concepts, idea recall | model-backed |
| `qmd query "<...>"` | hybrid (BM25 + vector + HyDE, RRF fusion) | default when unsure; mixed exact + conceptual | model-backed, slowest |

All accept `-n <limit>`, `-c <collection>` (repeatable), `--json`, `--files`,
`--min-score <f>`.

## Default: structured `qmd query`

You are the query expander. Write the fields yourself; the model only ranks.
A bare `qmd query "<user sentence>"` throws away context only you have.

```bash
qmd query $'intent: Find the concept note about metrics as instruments without letting OKRs replace judgment.\nlex: cockpit instruments OKR Goodhart metrics judgment\nvec: data informed not metric driven product judgment\nhyde: A concept note says metrics are useful like cockpit instruments, but leaders should remain data-informed rather than metric-driven.'
```

Fields (author each deliberately; need `intent:` + at least one of `lex:`/`vec:`):

- `intent:` — what you want **and what to avoid**. Steers ranking away from nearby-but-wrong concepts. Always supply.
- `lex:` — exact terms, aliases, titles, symbols, rare words you expect in the source.
- `vec:` — paraphrase of the idea in natural, source-like wording.
- `hyde:` — description of the hypothetical document/answer that would satisfy the request.

Routing rule: typed lines are routed exclusively — `lex` → FTS only, `vec`/`hyde`
→ vector only; the original query goes to both, fused with RRF. Do not mix a
standalone `expand:` query with typed lines (grammar-enforced).

## When to prefer lexical

- Verbatim phrase, product name, error string, function name → `qmd search`.
- Quote known: `qmd search '"AI Before Headcount"' -c concepts -n 5`.
- `query` slow or model/GPU broken → `qmd search` with stronger lexical terms.

## Query craft (all modes)

1. **Title/alias anchors** — exact page titles, named entities, phrases.
2. **Semantic paraphrase** — how a human would describe the idea.
3. **Negative space** — intent that excludes the nearby-but-wrong topics.

```bash
qmd search "cockpit OKR Goodhart" -n 10                       # lexical anchors
qmd search "six-week cadence merchant relationships" -c sources -n 10
qmd query --format json --explain $'intent: ...\nlex: ...\nvec: ...'   # inspect ranking
```

## Output for agents

- `--json` — structured results (docids, scores, paths).
- `--files` — file paths only; `--all` with it exports every match.
- `--min-score 0.3` — score floor; `--full-path` — on-disk paths instead of `qmd://` URIs (drop per-result docid).

```bash
qmd search "authentication" --json -n 10          # machine-readable
qmd search "API" --all --files --min-score 0.3     # export for an agent
```

## Failures

- `qmd query` fails on model/GPU → `qmd doctor` (Chapter 5), then fall back to `qmd search`.
- Results drifting into wrong corpus → pin collections with `-c` (Chapter 3).
- Need hard constraints (status, date, type) → `--filter` AST (Chapter 3).

Next: Chapter 2 — [retrieval.md](retrieval.md).
