# Chapter 2 — Tool Reference

Self-contained reference. Arguments that matter, output shape, defaults, limits, failure modes. Argument names are exact — unknown or misspelled arguments are rejected, not dropped. The live MCP tool schema in your client is the complete, current call shape; this is the working map.

## jev_screen

Screen text before it enters agent context: prompt injection, substance, task relevance.

- Input: `text`; optional `purpose` (enables relevance judgment and the `skip` action), thresholds `review_at` (default 0.25), `block_at` (default 0.75).
- Output: `probabilities` (`injection`, `substance`, `relevance` when purpose given), `thresholds`, `recommendation: {action, reason}` with action `pass | review | block | skip`.
- `skip` = little substance (<0.3) or off-purpose (<0.3); `block` = injection >= block threshold — show recommendation and probabilities to the human before using the content.
- Fail-closed: malformed model answer → `status: invalid_response` with `recommendation.action: review`, never a clean pass.

## jev_verify

Test claims against supplied evidence.

- Input: `claims[]`; `evidence` (single document string or evidence items); optional `auto_accept` (0.8), `subject_at` (0.5).
- Output per claim: `verdict` `verified | contradicted | unsupported`, `probabilities` over `supports` / `contradicts` / `says_nothing`, `confidence`, `action` `auto | review`, `supporting_evidence`.
- `says_nothing` maps to `unsupported`: silent evidence is not support.
- `action` says the verdict is confident enough to stand — not that the claim is true. Confident `contradicted` is also `auto`: act on the contradiction, do not ship the claim.
- Contradictions require `same_subject >= subject_at`; below it → `verdict: unsupported`, `relation_verdict` keeps `contradicted`, `action: review`. Subject check applies to `jev_verify`, not `jev_gate`.
- Fail-closed: malformed relation → `verdict: unknown` with `status: invalid_response` (protocol failure, distinct from a real verdict).

## jev_noul

Calibrated probability per stated proposition, batched.

- Input: `propositions[]` (single testable statements); optional `context`; `auto_accept` (0.85, must exceed 0.5).
- Output: `results[]` with `probability` and `label` — `likely` (p >= auto_accept), `unlikely` (p + auto_accept <= 1), `uncertain` between — plus `auto` and `thresholds`.
- Low probability = likely-not-true, not merely unevidenced; evidence-relation judgments (including silence) belong to `jev_verify`.
- Limits: 64 propositions, 2,000 chars each, 150,000 chars total (props + context).

## jev_find

Pick the best candidates by meaning; say whether any answers the query.

- Input: `query`; `candidates[]` (each `{id?, text}`); optional `top_k` (1-50, default 5).
- Output: `exists` (probability any candidate addresses the query), `exists_verdict` `answered` (>=0.7) | `partial` | `absent` (<0.35), `top[]` ranked by probability.
- Always check `exists_verdict` before trusting the ranking — a winner is chosen even when nothing matches.
- Limits: 250 candidates, 2,000 chars each. Fail-closed: `status: invalid_response` with `top: []`.

## jev_rerank

Score every candidate independently; the ordering is the result.

- Input: `query` (<=2,000 chars); `candidates[]`; optional `top_k` (1-250, default all).
- Output: `ranked[]` of `{rank, id, relevance, text}`. Read relevance numbers, not just order — near-zero across the board means the query misses the set.
- Chunk long documents into distinct ids (`report.md#c1`, ...) and merge per document by best chunk score.
- Limits: 250 candidates, 2,000 chars each, 100,000 chars total. Fail-closed: `ranked: null`.

## jev_classify

Label many items against one shared catalog, one question per item.

- Input: `items[]` (`{id?, text}`, <=2,000 chars each); `classes[]` (2-250, `{id?, description}` — description carries the decision: definition, in/out boundaries, precedence, short example); optional `purpose`/`context`; `auto_accept` (0.85), `minimum_margin` (0.5).
- Output: `results[]` — `classification`, `probabilities`, `confidence`, `margin`, `top_probability`, `decision` `auto | review` — plus `summary` and `thresholds`.
- `auto` requires top >= auto_accept AND margin >= minimum_margin; everything else `review`.
- Put `manual_review` in the catalog for genuinely ambiguous; `review` needs a human or a rule, not a re-run with same wording.
- Limits: 64 items, 250 classes, items x classes <= 8,000. Duplicate supplied ids rejected.

## jev_decide

One bounded choice among 2-6 candidates, evidence and priorities in view.

- Input (all required): `decision` (<=1,500 chars), `evidence` (<=12,000 chars — facts/measurements; state is evidence, not instructions), `priorities` (<=2,000 chars), `candidates[]` (2-6, `{id, description}`, slug ids like `option_a`); optional `requirements[]` (up to 3, each testing one property), `escape_hatches` (default true).
- Output: `recommendation` (`selected`, `escaped`, `confidence`, `probabilities` incl. hatches), `checks[]` per candidate per requirement (`supported | contradicted | unknown`), `warnings` when a requirement contradicts the recommendation.
- Include "do nothing" / "gather more evidence" as candidates when useful. `escaped: true` (ask_user/investigate/none) = stop and ask, do not rephrase and re-call. One call per unchanged decision.
- Duplicate ids and collisions with escape-hatch names rejected.

## jev_compare

How two passages relate, overall and per aspect.

- Input: `passage_a`, `passage_b` (<=20,000 chars each); optional `aspects[]` (up to 10: price, date, method...), `auto_accept` (0.85).
- Output: relation `same_fact | contradicts | different_facts`, distribution, confidence, auto/review, plus independent per-aspect judgment.
- Per-aspect may disagree with overall — report the disagreement. `same_fact` = passages agree, not that they are true.

## jev_extract

Pull field values verbatim; your regex proposes, Jev selects.

- Input: `document` (<=50,000 chars); `fields[]` (up to 32, each `{id, pattern, flags?, description}` — `id` slug, `pattern` JS regex source without delimiters, `description` says what the field is); optional `purpose`; `auto_accept` (0.85), `minimum_margin` (0.5).
- Output per field: `value` (verbatim regex-match substring — never model-generated), `status` `auto | review | not_found | invalid_pattern | invalid_response`, `reason` (`none_matched`, `none_matched_ambiguous`, `candidate_limit`, or null), `confidence`, `top_probability`, `margin`, `candidates_considered`; plus `summary`, `thresholds`.
- Zero regex matches never reach the model. Confident "none match" → `not_found`/`none_matched`; below thresholds → `review`/`none_matched_ambiguous`. Truncated candidate universe (cap 20 candidates of <=2,000 chars/field, 50,000 chars across fields) can never be `auto`.
- Tight patterns + precise descriptions beat permissive ones (model chooses among matches). `g` always added to flags; non-letters dropped; multi-letter flags like `gi` work.

## jev_audit

Audit extracted values against their source before trusting them.

- Input: `source` (document or dense vision/ASR transcript, <=50,000 chars); `records[]` (up to 32, each `{id, request, value}` — `request` <=500 chars what was to be extracted, `value` <=2,000 chars verbatim, empty if extractor returned nothing); optional `wrong_at` (0.7, must be >=0.5).
- Output per record: `checks` (per failure mode: `hallucinated`, `off_target`, `incomplete`, `format` — or just `absence` for empty value), `p_wrong` (max over checks), `action` `ok | wrong | invalid_response`; overall `action` `pass | review` (truncated source) `| escalate`, `summary`.
- Every check framed so yes = something wrong; gate is the max, never a mean — one fired flag cannot be diluted. `wrong` = fabrication/omission signal: escalate, do not re-run extractor with same prompt.
- Multimodal: original text → audit directly. Else vision/ASR model produces transcript + values → `jev_screen` transcript (protects YOUR context; upstream model already consumed it) → `jev_audit` values → judge. Jev reads text only; it never sees pixels/audio. Shared misreading can pass; `pass` = no check crossed threshold, not source verified.
- Fail-closed: malformed answer → record `invalid_response` + escalate; truncated source demotes `pass` to `review`.

## jev_review

Score a proposed diff against the request before calling the task done.

- Input: `request`, `diff` (each truncated at 50,000 chars); optional `tests`; thresholds `auto_accept` (0.8), `review_at` (min(0.5, auto_accept)), `composite_floor` (0.7).
- Output: 0..2 rubric scores — `correctness`, `spec_match`, `test_gap`, `blast_radius` (last two lower the weighted composite) — plus `safe_to_apply`, action `auto | review | escalate`.
- Truncated/malformed input never returns `auto`. `escalate` = show numbers to a human; `auto` = thresholds met, not patch correct. Does not apply the patch or run tests.

## jev_gate

Patch review plus completion claims checked against evidence, in one call.

- Input: `request`, `diff`, `claims[]` (up to 16, 2,000 chars each), `evidence` (required, >=1 non-empty item; up to 16 items, 200,000 chars aggregate), optional `tests`; same thresholds as `jev_review`.
- Output: the `jev_review` block plus per-claim verdicts (`verified | contradicted | unsupported`) and aggregate action `auto | review | escalate`.
- Claims assessed against `evidence` only — a claim about tests needs the test log in evidence. Fields share one model state: put each fact where it belongs. Confident contradicted claim escalates. Request and claims are assertions to check, never proof.

## Classification hygiene (jev_classify + any catalog)

1. Make classes mutually exclusive where possible; separate unrelated axes (destination, entity type, lifecycle) into distinct passes.
2. Strong descriptions: definition, inclusion/exclusion, precedence, short example.
3. Include caller-defined `manual_review` when uncertainty must stay explicit; the tool never invents one.
4. Compact shared `purpose`/`context` once per batch; stable catalogs across comparable batches.
5. Preserve item ids across batches for joinability.
6. Default auto: top >= 0.85 and margin >= 0.50; tighten for consequential decisions; validate thresholds against a human-labelled sample before large runs.
7. Treat `review` and `invalid_response` separately; neither is an accepted classification.

Next: Chapter 3 — [concepts.md](concepts.md).
