---
name: agy-review
description: >
  Delegate OpenSpec change plan review to a headless agy worker agent via print mode. Use when the user wants a fresh-eyes review of a change's planning artifacts using agy, saying "agy review", "review with agy", "fresh-eyes review", or "opsx agy review". Do NOT use when implementing changes (use openspec-pi-apply), verifying implementations (use agy-verify), updating plans (use agy-update), or reviewing directly without agy (use openspec-review). Never edits code.
allowed-tools: Bash(agy:*) Bash(openspec:*) Read
license: MIT
compatibility: Requires agy CLI, openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
---

# OpenSpec Agy Review Workflow

Delegate a fresh-eyes review of an active OpenSpec change to a headless `agy` worker in print mode. The worker runs the `openspec-review` procedure (read → check → revise → report); the supervisor diffs the revisions, triages assumptions, and re-validates before accepting anything.

## Step 1: Resolve the change

- Change name given → use it.
- Otherwise infer from context, auto-select when exactly one active change exists, else ask.
- Announce `Using change: <name>`.

## Step 2: Delegate review

From the workspace root, run:

```bash
agy --model gemini-3.8-flash-high --effort high --print="/openspec-review <name>"
```

Model and effort are pinned — perform no model selection. See [references/print-mode.md](references/print-mode.md) for the invocation contract.

## Step 3: Triage and accept

1. Diff the change directory before and after the worker turn.
2. For every revision and every stated assumption, ground it in prior artifacts or the codebase:
   - Grounded → keep.
   - Unstated leap → treat as a finding, not a fact: revert it or ask the user.
   - Ambiguity the worker flagged → resolve from specs/conventions if documented; otherwise escalate to the user, never guess.
3. Independently re-validate (never on worker claims alone):
   ```bash
   openspec validate <name>
   ```
4. Present the review summary and continue the planning workflow from the updated artifacts.

## Guardrails

- **Worker writes planning artifacts only.** Scope is `openspec/changes/<name>/`. Any edit outside it is rejected and reverted.
- **Do NOT edit project code** in this workflow — review never edits code, whether by worker or supervisor.
- **Do NOT accept revisions** without diffing them first. A worker PASS is a proposal, not a fact.
