# Agy print-mode invocation contract (update)

Headless revision runs through `agy --print` (single prompt, non-interactive).

## Command shape

```bash
agy --model gemini-3.8-flash-high --effort high --print="/openspec-update-change <name> <revision-goal>"
```

- Run with cwd set to the workspace root so the change directory resolves identically for worker and supervisor.
- Slash-command expansion is on by default in print mode (only `--disable-slash-commands` turns it off).
- Append the revision goal (new decision, scope change, reconciliation target) after the change name when one prompt line is not self-explanatory.
- Model (`gemini-3.8-flash-high`) and effort (`high`, the ceiling for suffixed models — bare `--effort max` is rejected) are pinned by operator decision.

## Output handling

- The worker revises files under `openspec/changes/<name>/` and reports what changed plus every assumption it made. Default `--output-format text`.
- Non-zero exit or empty output is a failed delegation, not a failed revision: report the spawn failure and stop — do not infer revisions.
- No session continuity is needed; do not use `--continue`/`--conversation`. Each revision is exactly one turn; follow-up turns are new delegations.
- The supervisor diffs before accepting anything (see SKILL.md step 3).
