---
name: openspec-review
description: >
  Fresh-eyes review of an OpenSpec change's planning artifacts with fixes applied in place. Use when the user wants a change proposal, specs, design, and tasks checked for correctness and coherence before implementation, saying "review change", "fresh-eyes review", or "opsx review". Do NOT use when implementing changes (use openspec-apply-change), verifying implementations (use openspec-verify-change), or revising toward a new decision (use openspec-update-change). Never edits code.
allowed-tools: Bash(openspec:*) Read Edit
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
---

# OpenSpec Review Workflow

Give an OpenSpec change a fresh-eyes review pass: read every planning artifact, ground every claim in the referenced codebase, and fix what fails — in the artifacts, in place.

## Step 1: Resolve the change

- Change name given → use it.
- Otherwise infer from context, auto-select when exactly one active change exists, else ask.
- Announce `Using change: <name>`.

## Step 2: Read everything

1. Read all four planning artifacts from `openspec/changes/<name>/` (proposal, specs, design, tasks) — from disk, in full.
2. Read every codebase file, spec, and config the artifacts reference or assume. Distinguish observed behavior from assumed behavior; mark each assumption.

## Step 3: Check every claim

- **Correctness**: does the referenced code/config actually say what the artifact claims?
- **Coherence**: do proposal, specs, design, and tasks agree with each other?
- **Buildability**: can each task be executed as written, in order, with the stated verifications?
- **Completeness**: is anything the design depends on missing from specs or tasks?

## Step 4: Fix in place

Revise the artifacts to fix every gap, contradiction, and unbuildable step found. Scope is the change directory — never touch implementation files, and never edit code. State every assumption inline in the report, not silently in the edit.

## Step 5: Report

```markdown
## Review Report: <change-name>

### Findings (fixed)
- <finding> → <fix applied>

### Findings (flagged, not fixed)
- <finding> → <why it needs a human>

### Assumptions
- <assumption> → <why it was needed>
```

## Guardrails

- **Planning artifacts only.** Any edit outside `openspec/changes/<name>/` is rejected and reverted.
- **Do NOT edit code.** Review never edits implementation files.
- **Do NOT invent requirements.** A gap with no grounded fix is flagged, not filled with speculation.
