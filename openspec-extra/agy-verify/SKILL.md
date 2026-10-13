---
name: agy-verify
description: >
  Delegate OpenSpec change verification review to a headless agy worker agent via print mode.
  Use when the user wants to verify an implemented change using agy as a reviewer engine,
  saying "agy verify", "verify with agy", or "opsx agy verify".
  Do NOT use when implementing changes (use openspec-pi-apply),
  or when verifying directly without agy (use openspec-verify-change).
allowed-tools: Bash(agy:*) Bash(openspec:*) Read
license: MIT
compatibility: Requires agy CLI, openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
---

# OpenSpec Agy Verify Workflow

Delegate verification review for an implemented OpenSpec change to a headless `agy` worker in print mode. The supervisor stays architectural gatekeeper: it reads the worker's report, checks it against the change artifacts, and only then clears the change for archiving.

See [references/print-mode.md](references/print-mode.md) for the invocation contract.

## Step 1: Resolve the change

- Change name given → use it.
- Otherwise infer from context, auto-select when exactly one active change exists, else ask.
- Announce `Using change: <name>`.

## Step 2: Delegate review

From the workspace root, run:

```bash
agy --model gemini-3.8-flash-high --effort high --print="/openspec-verify-change <name>"
```

The worker reads the change artifacts plus the implementation and prints a verification report (scorecard with verdicts per check). Model and effort are pinned — perform no model selection.

## Step 3: Gate on the report

1. Read the full report. Do NOT skim to the verdict line.
2. For every WARNING/FAIL the worker raises, ground it in `openspec/changes/<name>/` artifacts:
   - Grounded and correct → fix the implementation (or the artifact, if the artifact is what's wrong) and re-run verification.
   - Ungrounded or contradicted by the artifacts → discard with a one-line reason, continue.
   - Genuinely ambiguous → escalate to the user, never guess.
3. Independently confirm completion gates (never on worker claims alone):
   ```bash
   openspec instructions apply --change "<name>" --json   # progress.remaining === 0
   openspec validate --change "<name>"                    # strict clean
   ```
4. Present the verification summary and prompt: "Verified. You can archive this change with `/openspec-archive-change <name>`."

## Guardrails

- **Do NOT edit project files** in this workflow. Review is delegated; fixes belong to an apply pass.
- **Do NOT archive** on a worker PASS alone. The supervisor's own gate checks (step 3.3) are mandatory.
- **Do NOT pipe the worker's raw reasoning** into conversational logs. Summarize the scorecard; quote only verdict lines and grounded findings.
