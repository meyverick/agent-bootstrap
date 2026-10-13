# Agy print-mode invocation contract (review)

Headless review runs through `agy --print` (single prompt, non-interactive).

## Command shape

```bash
agy --model gemini-3.8-flash-high --effort high --print="/openspec-review <name>"
```

- Run with cwd set to the workspace root so the change directory resolves identically for worker and supervisor.
- Slash-command expansion is on by default in print mode (only `--disable-slash-commands` turns it off) — the worker receives the expanded `openspec-review` skill, not the literal slash line.
- Model (`gemini-3.8-flash-high`) and effort (`high`, the ceiling for suffixed models — bare `--effort max` is rejected) are pinned by operator decision.

## Output handling

- The worker revises files under `openspec/changes/<name>/` and reports findings plus every assumption. Default `--output-format text`.
- Non-zero exit or empty output is a failed delegation, not a failed review: report the spawn failure and stop — do not infer findings.
- No session continuity is needed; do not use `--continue`/`--conversation`. Each review is exactly one turn; follow-up turns are new delegations.
- The supervisor diffs before accepting anything (see SKILL.md step 3).
