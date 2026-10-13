# Agy print-mode invocation contract

Headless review runs through `agy --print` (single prompt, non-interactive).

## Command shape

```bash
agy --model gemini-3.8-flash-high --effort high --print="/openspec-verify-change <name>"
```

- Run with cwd set to the workspace root so the change directory and the implementation resolve identically for worker and supervisor.
- Slash-command expansion is on by default in print mode (only `--disable-slash-commands` turns it off) — the worker receives the expanded `openspec-verify-change` skill, not the literal slash line.
- Model (`gemini-3.8-flash-high`) and effort (`high`) are pinned by operator decision. Do not substitute, negotiate, or omit them.

## Output handling

- Default `--output-format text`: the verification report lands on stdout. Read it whole; do not grep for the verdict.
- Non-zero exit or empty output is a failed delegation, not a failed review: report the spawn failure and stop — do not infer a verdict.
- No session continuity is needed (review is stateless); do not use `--continue`/`--conversation`. Each verification is exactly one turn.
