---
name: openspec-pi-explore
description: >
  Delegate OpenSpec exploration, codebase investigation, and architectural analysis
  to a headless pi worker agent via JSON-RPC. Use when the user wants to explore
  an idea, investigate a problem, or compare options using pi as a worker engine,
  saying "pi explore", "opsx pi explore", or "explore with pi".
  Do NOT use when exploring directly in the host agent (use openspec-explore),
  when applying changes with pi (use pi-worker --mode apply), or when proposing/scaffolding
  change artifacts (use openspec-propose).
allowed-tools: Bash(bun:*) Bash(openspec:*) Read Grep
license: MIT
compatibility: Requires pi CLI, bun, and openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
---

# OpenSpec Pi Explore Workflow

Delegate read-only OpenSpec exploration and architectural investigation for a user `<prompt>` to a headless `pi` worker engine communicating over JSON-RPC. The host agent acts as architectural supervisor: inspecting workspace context, evaluating inquiry complexity, asking the user which model and reasoning level to use (unless already specified), autonomously triaging worker questions via same-session `--mode prompt` follow-ups, enforcing strict read-only guardrails, and presenting the worker's synthesized exploration report.

> **Path Resolution**: All `scripts/` and `references/` paths below are relative to this skill's directory (e.g., `.agents/skills/pi-worker/`). Resolve them against the skill's base directory when invoking commands from the workspace root.

## Contrast Matrix

| Dimension | Direct Explore (`openspec-explore`) | Headless Pi Explore (pi-worker `--mode explore`) | Headless Pi Apply (pi-worker `--mode apply`) |
| :--- | :--- | :--- | :--- |
| **Execution** | Host agent searches codebase and explores in main turn context | Child process worker (`pi -a --session-id <id> --mode rpc`) investigates and returns report | Child process worker executes code edits from `tasks.md` |
| **Mutation Policy** | Read-only by default; may capture OpenSpec artifacts if user confirms | **Strictly read-only**: neither worker nor supervisor writes code or OpenSpec artifacts; returns report/reply only | Mutates project files to complete implementation tasks |
| **Clarifications** | Asks human directly in chat | Supervisor triages autonomously against specs, `config.yaml`, and codebase via same-session `--mode prompt` | Supervisor triages against change artifacts via same-session `--mode prompt` |

## Gotchas & Anti-Examples (What NOT to do)

- **Do NOT allow the worker or supervisor to write files** in this workflow. Neither project source files nor OpenSpec artifacts (`openspec/changes/`, `openspec/specs/`, `config.yaml`) may be created or modified. If the user asks to scaffold a change or implement code, direct them to `/openspec-propose` or `/pi-worker` (`--mode apply`).
- **Do NOT autonomously pick or hardcode `--model` or `--level`**. Always inspect `openspec list --json` and `openspec list --specs --json` in Step 1 first, then ask the user which model and reasoning level to use in Step 2 (unless the user already specified them in their request).
- **Do NOT pipe raw `pi` stdout directly** into conversational logs. Always use `scripts/pi-rpc.ts` to filter high-frequency token deltas and emit only clean tool events and the settled exploration report.
- **Do NOT use unescaped double quotes or backticks in `--prompt`**. Wrap `--prompt` payloads in single quotes (or escape `$` and `` ` ``) so bash does not evaluate code identifiers as subshells.
- **Do NOT skip `--session "<id>"` or reuse one id across concurrent delegations**. The id is passed through unchanged (convention: `openspec-<slug>`, strictly lowercase `a-z` words separated by single hyphens — spell out any digits such as `openspec-oauth-two-a`); resuming a paused worker reuses the exact `--session "<id>"` with `--mode prompt --prompt '<answer>'`.
- **Do NOT approve artifact capture if the worker offers it**. If the worker asks whether to create or update `proposal.md`, `design.md`, or `specs/`, resume with `--mode prompt --session "<id>" --prompt '...'` instructing it to include all proposed designs and requirements directly in its markdown report without writing files.

## Workflow Checklist

- [ ] **Step 1**: Inspect OpenSpec context (`openspec list --json`, `openspec list --specs --json`) and evaluate `<prompt>` complexity.
- [ ] **Step 2**: Ask the user which `--model` and `--level` to use (if not already specified in their prompt) and spawn `scripts/pi-rpc.ts` with a unique `--session`.
- [ ] **Step 3 & 4**: Triage settlement status (`COMPLETED`, `PAUSED_FOR_CLARIFICATION`, or `FAILED`), autonomously resolving worker questions via same-session `--mode prompt` follow-ups.
- [ ] **Step 5**: Verify no files were mutated and present the worker's exploration report to the user.

---

## Workflow — 5 Steps

### Step 1: Pre-Flight Context & Inquiry Scope Analysis

1. **Inspect OpenSpec Workspace State**:
   Check active changes and registered capabilities (append `--store "<id>"` if the user named a standalone OpenSpec store):
   - Active changes: `openspec list --json`
   - Durable specs: `openspec list --specs --json`
   *(If `openspec list --json` reports a malformed or unregistered store in `openspec/config.yaml`, halt and surface the error message and fix to the user.)*
2. **Inspect Referenced Change or Spec Metadata (If Applicable)**:
   If the user's `<prompt>` names a specific active change or capability spec, briefly inspect its status or summary so you can gauge scope and enrich the request context:
   - Named change: `openspec status --change "<name>" --json`
   - Named spec: `openspec show "<spec-id>" --type spec --json --no-scenarios`
3. **Evaluate Inquiry Scope & Analytical Depth**:
   Assess `<prompt>` alongside the Step 1.1–1.2 context across three dimensions so you can summarize the scope when asking the user for the worker configuration:
   - **Investigative Breadth**: Single file/function vs. localized module/spec vs. cross-cutting multi-module or system-wide architecture.
   - **Cognitive Depth**: Factual lookup/flow tracing vs. multi-option tradeoff comparison vs. deep root-cause diagnosis, concurrency, or protocol/parser design.
   - **Specification Coupling**: Greenfield brainstorming vs. reconciling multiple existing specs and in-flight changes.

### Step 2: User Model & Reasoning Level Selection & Worker Spawning

1. **Ask the User for `--model` and `--level` (Mandatory when not already specified)**:
   - If the user already specified the target model and reasoning level in their request, use those values directly.
   - Otherwise, ask the user which model (`--model`) and reasoning level (`--level`, e.g., `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`) they want the `pi` worker to use, sharing a brief summary of the inquiry scope from Step 1.
   - *(Note: Invoking `bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --model` with no argument prints a plain-text reminder instructing you to ask the user for the model and reasoning level.)*

2. **Spawn Explore Runner**:
   Compose a fresh unique session id per delegation (convention `openspec-<topic>-<suffix>`, strictly lowercase `a-z` words separated by single hyphens — spell out any digits so `validateSessionId` passes and concurrent delegations never collide) and execute the bridge runner with single quotes around `--prompt` and the user's chosen `--model` and `--level`:
   ```bash
   bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode explore --session "<id>" --model "<model>" --level "<level>" --prompt '<prompt>'
   ```
   - Forwards `--model` and `--level` (`--thinking`) directly to `pi -a --session-id "<id>" --mode rpc`
   - Transmits `/skill:openspec-explore <prompt>` over stdin along with a strict read-only report mandate (forbidding file or OpenSpec artifact writes)
   - Filters raw token deltas, emitting clean tool progress logs (`⚙ [pi:tool] Invoking: ...`) and capturing the worker's final markdown report between `[EXPLORE_REPORT_START]` and `[EXPLORE_REPORT_END]` upon `agent_settled`
   - *Progressive Disclosure*: Do **not** load [references/rpc-protocol.md](references/rpc-protocol.md) during normal execution; read it **only** if you need to diagnose malformed JSON-RPC framing or runner stream errors.

### Step 3: Triage Worker Settlement State

Evaluate the runner's exit status and captured worker response:

#### Case A: `[STATUS] COMPLETED`

The worker emitted `[EXPLORE_REPORT_START] ... [EXPLORE_REPORT_END]` with a complete exploration report or answer. Proceed directly to **Step 5: Read-Only Verification & Report Presentation**.

#### Case B: `[STATUS] PAUSED_FOR_CLARIFICATION`

The worker paused to ask a clarifying question, narrow an investigative branch, or ask whether to capture artifacts.

1. Read the worker's question from the runner log (`[EXPLORE_REPORT_START] ... [EXPLORE_REPORT_END]` or `[PROMPT_RESPONSE_START] ... [PROMPT_RESPONSE_END]` on follow-up turns).
2. **Autonomous Supervisor Triage (Default)**:
   - **Artifact Capture Offers**: If the worker asks whether to scaffold a change (`openspec new change`) or write/update an OpenSpec artifact (`proposal.md`, `design.md`, `specs/`, `tasks.md`), **always refuse file creation** and resume via `--mode prompt` on the exact same `--session "<id>"`:
     ```bash
     bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode prompt --session "<id>" --prompt 'Do not create or modify any files or OpenSpec artifacts. Synthesize all findings, ASCII diagrams, tradeoff comparisons, and proposed specification/design details directly into your final markdown response.'
     ```
   - **Codebase, Spec, or Context Questions**: Cross-reference the worker's question against `openspec/config.yaml`, `openspec/specs/**/*.md`, `openspec/changes/**/*.md`, `AGENTS.md`, and the codebase using `Read` and `Grep`. Formulate a concise answer grounded in repository context and resume the worker via `--mode prompt` on the same `--session "<id>"` (single-quoting the `--prompt` payload so the answer is sent raw without re-invoking `/skill:openspec-explore`):
     ```bash
     bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode prompt --session "<id>" --prompt '<clarification-answer>'
     ```
   - Inspect the follow-up response between `[PROMPT_RESPONSE_START]` and `[PROMPT_RESPONSE_END]`: if it delivers the complete exploration report without a blocking question, proceed to **Step 5**; if it ends with another clarifying question (`?`), repeat **Case B**.
3. **Human Escalation (Last Resort)**:
   - Only if the worker's question requires a subjective product decision or external business constraint that cannot be inferred from the user's request, specs, or codebase, ask the user directly, then resume with `--mode prompt --session "<id>" --prompt '<user-answer>'` and return to **Step 3**.

#### Case C: `[STATUS] FAILED`

Worker exited with an error, stalled in a tool loop, or timed out.

1. Inspect stderr and diagnostic logs to determine the cause (e.g., invalid model/level, reasoning stall, provider timeout/rate limit, or fatal workspace error).
2. Report the diagnostic details to the user and ask whether they want to retry with a different `--model` or `--level`. Do not autonomously switch models without user confirmation.

### Step 4: Resume Iteration Loop

Repeat Step 3 until `[STATUS] COMPLETED` is reached with a complete exploration report or answer.

### Step 5: Read-Only Verification & Report Presentation

1. **Verify Read-Only Invariant**:
   Confirm that no project files or `openspec/` directories were created or modified during the worker session (if any write tool was invoked by mistake, revert the stray changes immediately).
2. **Present Exploration Report**:
   Present the worker's synthesized exploration report to the user—preserving its ASCII diagrams, architecture maps, tradeoff tables, and recommendations—along with a brief footer noting the `--model` and `--level` configuration used and optional next steps (e.g., `/openspec-propose` if the user wishes to turn the findings into a formal change).