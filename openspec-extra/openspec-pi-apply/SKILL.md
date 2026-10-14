---
name: openspec-pi-apply
description: >
  Delegate OpenSpec change task implementation to a headless pi worker agent via JSON-RPC.
  Use when the user wants to apply an OpenSpec change using pi as a worker engine,
  saying "pi apply", "opsx pi apply", or "apply change with pi".
  Do NOT use when applying changes directly without pi (use openspec-apply-change),
  or when proposing/planning changes (use openspec-propose).
allowed-tools: Bash(bun:*) Bash(openspec:*) Read Grep
license: MIT
compatibility: Requires pi CLI, bun, and openspec CLI.
metadata:
  author: agentic
  version: "1.3.0"
---

# OpenSpec Pi Apply Workflow

Delegate task execution for an active OpenSpec change to a headless `pi` worker engine communicating over JSON-RPC. The host agent acts as architectural supervisor: assessing change complexity, querying the live model registry to select a valid worker configuration, triaging worker questions against specification artifacts, and enforcing verification gates.

> **Path Resolution**: All `scripts/` and `references/` paths below are relative to this skill's directory (e.g., `.agents/skills/openspec-pi-apply/`). Resolve them against the skill's base directory when invoking commands from the workspace root.

## Contrast Matrix

| Dimension | Direct Supervisor (`openspec-apply-change`) | Headless Pi Worker (`openspec-pi-apply`) | Why Different |
| :--- | :--- | :--- | :--- |
| **Execution** | Supervisor edits project files directly in turn context | Child process worker (`pi -a --session-id openspec-<name> --mode rpc`) executes edits | Prevents supervisor context bloat & high turn latency |
| **Supervision** | Self-directed implementation | Supervisor selects worker tier, monitors tool events & validates completion gates | Decouples code authoring from architectural oversight |
| **Clarifications** | Halts and asks human immediately | Supervisor triages autonomously against change artifacts | Eliminates unnecessary user interruptions for specified details |

## Gotchas & Anti-Examples (What NOT to do)

- **Do NOT edit project files directly** in this workflow. Task implementation is delegated to the worker process via `scripts/pi-rpc-apply.ts`.
- **Do NOT select a model before inspecting the change tasks**. Always inspect `openspec instructions apply --change "<name>" --json` in Step 1.3 before choosing `--model` and `--thinking`.
- **Do NOT assume or memorize model names or thinking levels**. `scripts/models.json` is a dynamic registry; always run `--model` discovery in Step 2.1 and select strictly from its live output.
- **Do NOT pipe raw `pi` stdout directly** into conversational logs. Always use `scripts/pi-rpc-apply.ts` to filter high-frequency token deltas and prevent buffer stalls.
- **Do NOT use unescaped double quotes or backticks in `--reply`**. Wrap `--reply` payloads in single quotes (or escape `$` and `` ` ``) so bash does not evaluate code identifiers as subshells.
- **Do NOT guess unstated requirements** when the worker pauses for clarification. If an answer cannot be grounded in `specs/`, `design.md`, or `AGENTS.md`, escalate to the user.
- **Do NOT mark the change complete** based solely on worker claims. Verify that `openspec instructions apply --change "<name>" --json` confirms `remaining: 0`.

## Workflow Checklist

- [ ] **Step 1**: Verify `isPlanningComplete: true` and evaluate task scope (`remaining`, files, cognitive depth).
- [ ] **Step 2**: Query live `--model` registry, snap `--thinking` to the chosen model's allowed array, and spawn runner.
- [ ] **Step 3 & 4**: Triage settlement status (`COMPLETED`, `PAUSED_FOR_CLARIFICATION`, or `FAILED`) and iterate until done.
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
   Evaluate the payload (and read `openspec/changes/<name>/design.md` if present) across three routing dimensions:
   - **Blast Radius**: Total remaining tasks (`progress.remaining`) and number of distinct files/modules touched.
   - **Cognitive Depth**: Mechanical edits/docs vs. standard CRUD/wiring vs. complex state machines, parsers, concurrency, or Rust crates.
   - **Coupling Risk**: Isolated single-module changes vs. cross-cutting architectural refactors or schema migrations.

### Step 2: Live Registry Discovery & Worker Spawning

1. **Query the Live Model Registry (Mandatory)**:
   Inspect the currently registered models and their exact supported thinking levels (emits minified JSON `{"<model>":["level",...]}` from `scripts/models.json`): `bun run .agents/skills/openspec-pi-apply/scripts/pi-rpc-apply.ts --model`
   Treat this command's output as the **Single Source of Truth** for both model availability and valid thinking levels.

2. **Map Change Complexity to Live Models**:
   Classify the models returned in Step 2.1 by their capability profile (inferred from model family/tier naming such as `flash`/`lightning`/`free` vs. standard/reasoning vs. `pro`/`ultra` and their supported thinking ceiling) and match against the Step 1 scope assessment:

   | Complexity Tier | Scope Signals (from Step 1) | Model Selection Heuristic (from Step 2.1 output) | Target Thinking Depth |
   | :--- | :--- | :--- | :--- |
   | **Tier 0: Trivial / Mechanical** | 1 file; docs, comments, config tweaks, renames, formatting, or boilerplate | Select a fast/lightweight model (`*-flash*`, `*-lightning*`, or `*-free`) | `minimal` or `low` *(or `off` for pure text)* |
   | **Tier 1: Routine / Light** | 1–2 files; isolated bug fixes, simple helper functions, minor test additions, UI copy/styles | Select a fast general model (`*-flash*` or standard tier) | `low` or `medium` |
   | **Tier 2: Moderate / Feature** | 2–5 files; standard feature wiring, API endpoints, state management, integration test suites | Select a strong code/reasoning model (capable `*-flash` with `high`/`max` ceiling, contributor, or `*-ultra*`) | `high` |
   | **Tier 3: Complex / Architectural** | 5+ files or cross-cutting systems; parsers, expression engines, concurrency, DB migrations, Rust crates | Select a flagship model (`*-pro*`, `*-ultra*`, or a reasoning model supporting `xhigh`/`max`) | `high`, `xhigh`, or `max` |

3. **Snap `--thinking` to the Model's Allowed Array**:
   Verify that your target thinking level exists in the chosen model's array from Step 2.1 (`{"<selected-model>": [...]}`):
   - **Exact Match**: If the target level is present in the model's array, use it directly.
   - **Nearest Valid Level (Snapping)**: If a model omits an intermediate level (e.g., supporting `["low", "high", "max"]` without `"medium"`, or only supporting `["high"]`), snap to the nearest valid level in its array—rounding **up** when task coupling is non-trivial and **down** for mechanical edits. Never pass a thinking level omitted from that model's Step 2.1 array.

4. **Spawn Runner**:
   Execute the bridge runner with the validated `--model` (bare or `<provider>/<model>`) and `--thinking` level: `bun run .agents/skills/openspec-pi-apply/scripts/pi-rpc-apply.ts --change "<name>" --model "<model>" --thinking "<level>"`
   - Validates `--model` and `--thinking` against `scripts/models.json` and spawns `pi -a --session-id "openspec-<name>" --mode rpc`
   - Enforces change-scoped session isolation and transmits `/skill:openspec-apply-change <name>` over stdin
   - Filters raw token noise, emitting clean tool progress logs (`⚙ [pi:tool] Invoking: ...`) until `agent_settled`
   - *Progressive Disclosure*: Do **not** load [references/rpc-protocol.md](references/rpc-protocol.md) during normal execution; read it **only** if you need to diagnose malformed JSON-RPC framing or runner stream errors.

### Step 3: Triage Worker Settlement State

Evaluate the runner's exit status:

#### Case A: `[STATUS] COMPLETED`

All tasks in `tasks.md` are marked complete (`remaining: 0`). Proceed directly to **Step 5: Completion Verification**.

#### Case B: `[STATUS] PAUSED_FOR_CLARIFICATION`

Worker paused with remaining tasks or posted a question before finishing.

1. Read the worker's question from the runner log.
2. Cross-reference the question against `openspec/changes/<name>/specs/**/*.md`, `openspec/changes/<name>/design.md`, `openspec/changes/<name>/proposal.md`, and `AGENTS.md`.
3. **Autonomous Resolution**:
   If the answer is documented in specifications or project conventions, formulate a concise clarification grounded in the artifacts and resume worker execution (using single quotes around `--reply` to prevent shell expansion): `bun run .agents/skills/openspec-pi-apply/scripts/pi-rpc-apply.ts --change "<name>" --reply '<clarification-answer>'`
   Return to **Step 3** to inspect the next settlement state.
4. **Human Escalation**:
   If the question involves genuine domain ambiguity, unstated product preference, or missing credentials not covered by specs, ask the user directly. Once answered, resume with `--reply '<user-answer>'` and return to **Step 3**.

#### Case C: `[STATUS] FAILED`

Worker exited with an error, stalled in a tool loop, or timed out.

1. Inspect stderr and diagnostic logs to classify the failure against the live registry from Step 2.1:
   - **Reasoning / Implementation Stall**: Retry once by stepping up to the next valid thinking level in the current model's array (e.g., `medium` -> `high` -> `xhigh`/`max`) or switching to a higher-tier model from Step 2.1.
   - **Provider Timeout / Rate Limit**: Retry once using an alternate model from Step 2.1 at an equivalent supported thinking level.
2. If the escalated retry also returns `[STATUS] FAILED`, or if caused by a fatal workspace error, halt and report the diagnostic details to the user.

### Step 4: Resume Iteration Loop

Repeat Step 3 until `[STATUS] COMPLETED` is reached or human intervention is required.

### Step 5: Completion Verification

1. **Confirm Task Completion**:
   Verify all tasks are checked off (`progress.remaining === 0`): `openspec instructions apply --change "<name>" --json`
2. **Validate Change Integrity**:
   Run OpenSpec validation and relevant project verification suites (linters, typecheck, or tests): `openspec validate --change "<name>"`
3. **Present Implementation Summary**:
   Report the change name, model/thinking configuration used, completed task summary, and verification status, then prompt: *"All tasks complete! You can archive this change with `/openspec-archive-change <name>`."*
