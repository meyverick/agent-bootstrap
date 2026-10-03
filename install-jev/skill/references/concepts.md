# Chapter 3 — Concepts & Providers

Self-contained reference. Read for the underlying primitives, confidence semantics, provider wiring, and cost/data rules.

## The three primitives

Jev (TypeSafe's System One model) answers typed questions — not free text:

- **Noul** — yes/no proposition → calibrated probability the answer is yes. (`jev_noul`)
- **Choice** — closed set → selected option + probability per option + confidence. (`jev_decide`, `jev_classify` internal)
- **Score** — ordered descriptive levels → score + probability per level + confidence. (`jev_review` rubric internal)

Everything else (verify, screen, find, rerank, compare, extract, audit, gate)
composes these primitives into task-shaped tools with validated answers.

## Probability vs confidence

- **Probability** answers *what*: P(supports), P(yes), per-option shares. Always read the whole distribution — `supports 0.94` and a `0.51/0.49` split are both "positive" but demand different action.
- **Confidence** answers *whether to act*: TypeSafe's certainty in its own judgment. Use it as a second axis (confidence-gated routing): low confidence + consequential decision → escalate with numbers attached.
- **Thresholds** (`auto_accept`, `minimum_margin`, `review_at`, `block_at`, `wrong_at`) are the operational bridge: `auto` = your thresholds were met, not "true". Tune per consequence; validate against a human-labelled sample before large batches.

## Fail-closed contract (why errors look like results)

- Unknown/misspelled arguments → hard error (never silently dropped).
- Missing/malformed model answer → explicit `invalid_response` (never clean pass / no-match / empty ranking).
- `escaped` (decide) → stop and ask; rephrasing and re-calling is forbidden.
- Truncated inputs → demoted actions (never `auto`).
Treat any of these as operational failure: fix input or call, never assume success.

## Provider wiring (env var NAMES only)

Auto-detection order (first present wins):

| # | Provider | Env vars | Notes |
|---|----------|----------|-------|
| 1 | TypeSafe direct (default) | `TYPESAFE_API_KEY` | recommended when you have several keys |
| 2 | OpenRouter | `OPENROUTER_API_KEY` | `sk-or-` key; pinned versions rather than `latest` |
| 3 | Cloudflare Workers AI | `CLOUDFLARE_API_TOKEN` (or `JEV_CLOUDFLARE_API_TOKEN`) + `CLOUDFLARE_ACCOUNT_ID` | always-current alias |
| 4 | Vercel AI Gateway | `AI_GATEWAY_API_KEY` | usage appears in Vercel logs/budgets |

Control variables:

- `JEV_PROVIDER` — force `typesafe` | `openrouter` | `cloudflare` | `vercel` | `compatible` (never silent fallback on unknown/missing).
- `JEV_MCP_MODEL` — pin a version (e.g. `jev-1.13`); default `jev-latest`.
- `JEV_MCP_REQUEST_TIMEOUT_MS` (60000) — whole-request deadline; `JEV_MCP_MAX_ATTEMPTS` (3, clamped 1..6) — retries only on 408/409/429/5xx with jittered backoff.
- `JEV_API_BASE_URL` + `JEV_API_KEY` with `JEV_PROVIDER=compatible` — self-hosted/System One-compatible endpoint.

Keys live in the MCP server's `env` (client config) or the process environment —
never in rules files, skills, or committed configs. The installer preserves an
existing `env` verbatim; see `install-jev/` docs for the merge policy.

## Data handling & cost

- **By default inputs leave your environment** for the configured provider.
  Never send secrets, credentials, or private source unless policy allows.
- **Send only the evidence needed** for the decision; text is truncated per tool
  (limits in [tools.md](tools.md)) — chunk deliberately rather than hoping the
  tail survives.
- **Cost/latency:** ~150-500 ms per judgment, a fraction of a cent; every
  successful model-calling result reports **token usage** — report it when cost
  matters. Batch (noul/classify accept arrays) — batching is dramatically
  cheaper and faster than N single calls.
- **Judgments are signals, not proof.** Jev can be wrong even at high
  confidence; consequential decisions escalate to human or stronger reasoner.

## When NOT to use jev

- Exact string/pattern search → `rg` (deterministic, free).
- Trusted local files → no screen needed.
- Deterministic rules already decide → no classify call.
- Strict evidence proof required across many claims with no model judgment
  wanted → verify still models the relation; consider deterministic checks first.

Next: back to the syllabus — [../SKILL.md](../SKILL.md).
