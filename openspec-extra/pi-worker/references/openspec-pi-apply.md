---
name: openspec-pi-apply
description: >
  Delegate OpenSpec change task implementation to a headless pi worker agent via JSON-RPC.
  Use when the user wants to apply an OpenSpec change using pi as a worker engine,
  saying "pi apply", "opsx pi apply", or "apply change with pi".
  Do NOT use when applying changes directly without pi (use openspec-apply-change),
  when exploring or investigating without implementing (use pi-worker --mode explore or openspec-explore),
  or when proposing/planning changes (use openspec-propose).
allowed-tools: Bash(bun:*) Bash(openspec:*) Read Grep
license: MIT
compatibility: Requires pi CLI, bun, and openspec CLI.
metadata:
  author: agentic
  version: "1.4.0"
---

# OpenSpec Pi Apply Workflow

Delegate task execution for an active OpenSpec change to a headless `pi` worker engine communicating over JSON-RPC. The host agent acts as architectural supervisor: assessing change complexity, asking the user which model and reasoning level to use (unless already specified), autonomously triaging worker questions against specification artifacts via same-session `--mode prompt` follow-ups, and enforcing completion verification gates.

> **Path Resolution**: All `scripts/` and `references/` paths below are relative to this skill's directory (e.g., `.agents/skills/pi-worker/`). Resolve them against the skill's base directory when invoking commands from the workspace root.

## Contrast Matrix

| Dimension | Direct Apply (`openspec-apply-change`) | Headless Pi Apply (pi-worker `--mode apply`) | Headless Pi Explore (pi-worker `--mode explore`) |
| :--- | :--- | :--- | :--- |
| **Execution** | Host agent edits project files directly in main turn context | Child process worker (`pi -a --session-id <id> --mode rpc`) executes code edits | Child process worker investigates codebase in strict read-only mode |
| **Supervision** | Self-directed implementation | Supervisor asks user for worker model/level, monitors tool events & validates `remaining === 0` gate | Supervisor asks user for worker model/level, refuses file writes & presents report |
| **Clarifications** | Halts and asks human immediately | Supervisor triages autonomously against `specs/`, `design.md`, and `proposal.md` via same-session `--mode prompt` | Supervisor triages autonomously against specs, `config.yaml`, and codebase via same-session `--mode prompt` |

## Gotchas & Anti-Examples (What NOT to do)

- **Do NOT edit project files directly** in this workflow. Task implementation is delegated to the worker process via `scripts/pi-rpc.ts`.
- **Do NOT autonomously pick or hardcode `--model` or `--level`**. Always inspect `openspec instructions apply --change "<name>" --json` in Step 1.3 first, then ask the user which model and reasoning level to use in Step 2 (unless the user already specified them in their request).
- **Do NOT pipe raw `pi` stdout directly** into conversational logs. Always use `scripts/pi-rpc.ts` to filter high-frequency token deltas and prevent buffer stalls.
- **Do NOT use unescaped double quotes or backticks in `--prompt`**. Wrap `--prompt` payloads in single quotes (or escape `\$` and `` ` ``) so bash does not evaluate code identifiers as subshells.
- **Do NOT skip `--session "<id>"` or reuse one id across concurrent delegations**. The id is passed through unchanged (convention: `openspec-<slug>`, strictly lowercase `a-z` words separated by single hyphens — spell out any digits such as `openspec-oauth-two-a`); resuming a paused worker reuses the exact `--session "<id>"` with `--mode prompt --prompt '<answer>'`.
- **Do NOT guess unstated requirements** when the worker pauses for clarification. If an answer cannot be grounded in `specs/`, `design.md`, `proposal.md`, or `AGENTS.md`, escalate to the user.
- **Do NOT mark the change complete** based solely on worker claims or a `--mode prompt` follow-up's `[STATUS] COMPLETED`. Always verify that `openspec instructions apply --change "<name>" --json` confirms `remaining: 0`.

## Workflow Checklist

- [ ] **Step 1**: Verify `isPlanningComplete: true` and evaluate task scope (`remaining`, files, cognitive depth).
- [ ] **Step 2**: Ask the user which `--model` and `--level` to use (if not already specified in their prompt) and spawn `scripts/pi-rpc.ts`.
- [ ] **Step 3 & 4**: Triage settlement status (`COMPLETED`, `PAUSED_FOR_CLARIFICATION`, or `FAILED`), answer worker questions via same-session `--mode prompt` follow-ups, and re-verify `openspec instructions apply --change "<name>" --json` until `remaining === 0`.
- [ ] **Step 5**: Verify `progress.remaining === 0` and pass `openspec validate --change "<name>"`.

---

## Workflow — 5 Steps

### Step 1: Pre-Flight, Change Discovery & Scope Analysis

1. **Identify Target Change**:
   Resolve the change name from user input or active changes: `openspec list --json`
2. **Verify Planning Gate**:
   Confirm that all planning artifacts are ready: `openspec status --change "<name>" --json`
   Ensure `isPlanningComplete: true`. If planning is incomplete, halt and advise completing artifacts with `/openspec-continue-change` first.
3. **Inspect Task Scope & Architectural Blast Radius**:
   Retrieve the pending implementation instructions and task breakdown: `openspec instructions apply --change "<name>" --json`
   Evaluate the payload (and read `openspec/changes/<name>/design.md` if present) across three dimensions so you can summarize the scope when asking the user for the worker configuration:
   - **Blast Radius**: Total remaining tasks (`progress.remaining`) and number of distinct files/modules touched.
   - **Cognitive Depth**: Mechanical edits/docs vs. standard CRUD/wiring vs. complex state machines, parsers, concurrency, or Rust crates.
   - **Coupling Risk**: Isolated single-module changes vs. cross-cutting architectural refactors or schema migrations.

### Step 2: User Model & Reasoning Level Selection & Worker Spawning

1. **Ask the User for `--model` and `--level` (Mandatory when not already specified)**:
   - If the user already specified the target model and reasoning level in their request, use those values directly.
   - Otherwise, ask the user which model (`--model`) and reasoning level (`--level`, e.g., `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`) they want the `pi` worker to use, sharing a brief summary of the task scope from Step 1.
   - *(Note: Invoking `bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --model` with no argument prints a plain-text reminder instructing you to ask the user for the model and reasoning level.)*

2. **Spawn Apply Runner**:
   Compose a fresh unique session id per delegation (convention `openspec-<change-name>-<suffix>`, strictly lowercase `a-z` words separated by single hyphens — spell out any digits in `<change-name>` such as `oauth-two` so `validateSessionId` passes and concurrent delegations never collide). Execute the bridge runner with the user's chosen `--model` and `--level` (both passed straight through to `pi --model` and `pi --thinking`):
   ```bash
   bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode apply --session "<id>" --model "<model>" --level "<level>" --prompt "<name>"
   ```
   - Forwards `--model` and `--level` (`--thinking`) directly to `pi -a --session-id "<id>" --mode rpc`
   - Enforces change-scoped session isolation and transmits `/skill:openspec-apply-change <name>` over stdin with a supervisor mandate to check off `- [x]` in `tasks.md`
   - Filters raw token noise, emitting clean tool progress logs (`⚙ [pi:tool] Invoking: ...`), capturing the worker's turn report between `[APPLY_REPORT_START]` and `[APPLY_REPORT_END]`, and verifying `openspec instructions apply --change "<name>" --json` upon `agent_settled`
   - *Progressive Disclosure*: Do **not** load [references/rpc-protocol.md](references/rpc-protocol.md) during normal execution; read it **only** if you need to diagnose malformed JSON-RPC framing or runner stream errors.

### Step 3: Triage Worker Settlement State

Evaluate the runner's exit status and captured worker output:

#### Case A: `[STATUS] COMPLETED`

All tasks in `tasks.md` are marked complete (`remaining: 0`). Proceed directly to **Step 5: Completion Verification**.

#### Case B: `[STATUS] PAUSED_FOR_CLARIFICATION`

Worker paused with remaining tasks (`remaining > 0`) or posted a blocking question before finishing.

1. Read the worker's message between `[APPLY_REPORT_START]` and `[APPLY_REPORT_END]` (or `[PROMPT_RESPONSE_START]` and `[PROMPT_RESPONSE_END]` on follow-up turns) and the pending task list.
2. Cross-reference the question or remaining tasks against `openspec/changes/<name>/specs/**/*.md`, `openspec/changes/<name>/design.md`, `openspec/changes/<name>/proposal.md`, `AGENTS.md`, and the codebase using `Read` and `Grep`.
3. **Autonomous Resolution (Default)**:
   - If the answer is documented in specifications or project conventions (or if the worker completed the code edits but forgot to mark `- [x]` in `tasks.md`), formulate a concise instruction grounded in the artifacts and resume worker execution via `--mode prompt` on the exact same `--session "<id>"` (single-quoting the `--prompt` payload so the answer is sent raw without re-invoking `/skill:openspec-apply-change`):
     ```bash
     bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode prompt --session "<id>" --prompt '<clarification-answer>'
     ```
   - Because `--mode prompt` reports `[STATUS] COMPLETED` as soon as the prompt turn settles (without checking `tasks.md`), immediately verify task progress against the original change `<name>`:
     ```bash
     openspec instructions apply --change "<name>" --json
     ```
     If `progress.remaining === 0` (and `progress.total > 0`), proceed to **Step 5: Completion Verification**; if `progress.remaining > 0` or the worker asked another question, repeat **Case B**.
4. **Human Escalation (Last Resort)**:
   - Only if the question involves genuine domain ambiguity, unstated product preference, or missing credentials not covered by specs or codebase context, ask the user directly, then resume with `--mode prompt --session "<id>" --prompt '<user-answer>'`, verify `openspec instructions apply --change "<name>" --json`, and return to **Step 3**.

#### Case C: `[STATUS] FAILED`

Worker exited with an error, stalled in a tool loop, or timed out.

1. Inspect stderr and diagnostic logs to determine the cause (e.g., invalid model/level, reasoning stall, provider timeout/rate limit, or fatal workspace error).
2. Report the diagnostic details to the user and ask whether they want to retry with a different `--model` or `--level`. Do not autonomously switch models without user confirmation.

### Step 4: Resume Iteration Loop

Repeat Step 3 until `[STATUS] COMPLETED` is reached or human intervention is required.

### Step 5: Completion Verification

1. **Confirm Task Completion**:
   Verify all tasks are checked off (`progress.remaining === 0`): `openspec instructions apply --change "<name>" --json`
2. **Validate Change Integrity**:
   Run OpenSpec validation and relevant project verification suites (linters, typecheck, or tests): `openspec validate --change "<name>"`
3. **Present Implementation Summary**:
   Report the change name, `--model` and `--level` configuration used, completed task summary, and verification status, then prompt: *"All tasks complete! You can archive this change with `/openspec-archive-change <name>`."*
