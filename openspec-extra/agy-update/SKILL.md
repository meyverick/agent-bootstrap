---
name: agy-update
description: >
  Delegate OpenSpec change plan revision to a headless agy worker agent via print mode.
  Use when the user wants to revise a change's planning artifacts using agy,
  saying "agy update", "update with agy", or "opsx agy update".
  Do NOT use when implementing changes (use openspec-pi-apply),
  verifying implementations (use agy-verify), or revising directly without agy
  (use openspec-update-change). Never edits code.
allowed-tools: Bash(agy:*) Bash(openspec:*) Read
license: MIT
compatibility: Requires agy CLI, openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
---

# OpenSpec Agy Update Workflow

Delegate plan revision for an active OpenSpec change to a headless `agy` worker in print mode. The worker revises the change's planning artifacts; the supervisor diffs the result, triages assumptions, and re-validates before accepting anything.

Unlike verification (read-only), update writes files — but strictly inside the change directory. The single-turn print-mode shape still fits: the worker states every assumption inline instead of asking, and the supervisor resolves them after. See [references/print-mode.md](references/print-mode.md) for the invocation contract.

## Step 1: Resolve the change

- Change name given → use it.
- Otherwise infer from context, auto-select when exactly one active change exists, else ask.
- Announce `Using change: <name>`.

## Step 2: Delegate revision

From the workspace root, run:

```bash
agy --model gemini-3.8-flash-high --effort high --print="/openspec-update-change <name>"
```

Model and effort are pinned — perform no model selection. State the revision goal (what changed, which decision, what to reconcile) as part of the prompt after the slash command when the worker needs more than the change name.

## Step 3: Triage and accept

1. Diff the change directory before and after the worker turn.
2. For every revision and every stated assumption, ground it in prior artifacts or the new instruction:
   - Grounded → keep.
   - Unstated leap → treat as a finding, not a fact: revert it or ask the user.
   - Ambiguity the worker flagged → resolve from specs/conventions if documented; otherwise escalate to the user, never guess.
3. Independently re-validate (never on worker claims alone):
   ```bash
   openspec validate <name>
   ```
4. Present the revision summary and continue the planning workflow from the updated artifacts.

## Guardrails

- **Worker writes planning artifacts only.** Scope is `openspec/changes/<name>/`. Any edit outside it is rejected and reverted.
- **Do NOT edit project code** in this workflow — update never edits code, whether by worker or supervisor.
- **Do NOT accept revisions** without diffing them first. A worker PASS is a proposal, not a fact.
