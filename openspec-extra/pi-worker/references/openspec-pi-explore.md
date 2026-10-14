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

Delegate read-only OpenSpec exploration and architectural investigation for a user `<request>` to a headless `pi` worker engine communicating over JSON-RPC. The host agent acts as architectural supervisor: inspecting workspace context, evaluating inquiry complexity, querying the live model registry to select a valid worker configuration, autonomously triaging worker questions via same-session `--request` follow-ups, enforcing strict read-only guardrails, and presenting the worker's synthesized exploration report.

> **Path Resolution**: All `scripts/` and `references/` paths below are relative to this skill's directory (e.g., `.agents/skills/pi-worker/`). Resolve them against the skill's base directory when invoking commands from the workspace root.

## Contrast Matrix

| Dimension | Direct Explore (`openspec-explore`) | Headless Pi Explore (pi-worker `--mode explore`) | Headless Pi Apply (pi-worker `--mode apply`) |
| :--- | :--- | :--- | :--- |
| **Execution** | Host agent searches codebase and explores in main turn context | Child process worker (`pi -a --session-id openspec-explore-<slug> --mode rpc`) investigates and returns report | Child process worker executes code edits from `tasks.md` |
| **Mutation Policy** | Read-only by default; may capture OpenSpec artifacts if user confirms | **Strictly read-only**: neither worker nor supervisor writes code or OpenSpec artifacts; returns report/reply only | Mutates project files to complete implementation tasks |
| **Clarifications** | Asks human directly in chat | Supervisor triages autonomously against specs, `config.yaml`, and codebase via same-session `--request` | Supervisor triages against change artifacts via same-session `--request` |

## Gotchas & Anti-Examples (What NOT to do)

- **Do NOT allow the worker or supervisor to write files** in this workflow. Neither project source files nor OpenSpec artifacts (`openspec/changes/`, `openspec/specs/`, `config.yaml`) may be created or modified. If the user asks to scaffold a change or implement code, direct them to `/openspec-propose` or `/pi-worker` (`--mode apply`).
- **Do NOT select a model before assessing the request and OpenSpec context**. Always inspect `openspec list --json` and `openspec list --specs --json` in Step 1 before choosing `--model` and `--level`.
- **Do NOT assume or memorize model names or thinking levels**. `references/models.json` is a dynamic registry; always run `--model` discovery in Step 2.1 and select strictly from its live output.
- **Do NOT pipe raw `pi` stdout directly** into conversational logs. Always use `scripts/pi-rpc.ts` to filter high-frequency token deltas and emit only clean tool events and the settled exploration report.
- **Do NOT use unescaped double quotes or backticks in `--request`**. Wrap `--request` payloads in single quotes (or escape `$` and `` ` ``) so bash does not evaluate code identifiers as subshells.
- **Do NOT approve artifact capture if the worker offers it**. If the worker asks whether to create or update `proposal.md`, `design.md`, or `specs/`, resume with `--request` instructing it to include all proposed designs and requirements directly in its markdown report without writing files.

## Workflow Checklist

- [ ] **Step 1**: Inspect OpenSpec context (`openspec list --json`, `openspec list --specs --json`) and evaluate `<request>` complexity.
- [ ] **Step 2**: Query live `--model` registry, snap `--level` to the chosen model's allowed array, and spawn `scripts/pi-rpc.ts` with a unique `--session`.
- [ ] **Step 3 & 4**: Triage settlement status (`COMPLETED`, `PAUSED_FOR_CLARIFICATION`, or `FAILED`), autonomously resolving worker questions via same-session `--request` follow-ups.
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
   If the user's `<request>` names a specific active change or capability spec, briefly inspect its status or summary so you can gauge scope and enrich the request context:
   - Named change: `openspec status --change "<name>" --json`
   - Named spec: `openspec show "<spec-id>" --type spec --json --no-scenarios`
3. **Evaluate Inquiry Scope & Analytical Depth**:
   Assess `<request>` alongside the Step 1.1–1.2 context across three routing dimensions:
   - **Investigative Breadth**: Single file/function vs. localized module/spec vs. cross-cutting multi-module or system-wide architecture.
   - **Cognitive Depth**: Factual lookup/flow tracing vs. multi-option tradeoff comparison vs. deep root-cause diagnosis, concurrency, or protocol/parser design.
   - **Specification Coupling**: Greenfield brainstorming vs. reconciling multiple existing specs and in-flight changes.

### Step 2: Live Registry Discovery & Worker Spawning

1. **Query the Live Model Registry (Mandatory)**:
   Inspect the currently registered models and their exact supported thinking levels (emits minified JSON `{"<model>":["level",...]}` from `references/models.json`):
   ```bash
   bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --model
   ```
   Treat this command's output as the **Single Source of Truth** for both model availability and valid thinking levels.

2. **Map Inquiry Complexity to Live Models**:
   Classify the models returned in Step 2.1 by their capability profile (inferred from model family/tier naming such as `flash`/`lightning`/`free` vs. standard/reasoning vs. `pro`/`ultra` and their supported thinking ceiling) and match against the Step 1 inquiry assessment:

   | Complexity Tier | Inquiry Signals (from Step 1) | Model Selection Heuristic (from Step 2.1 output) | Target Thinking Depth |
   | :--- | :--- | :--- | :--- |
   | **Tier 0: Pinpoint / Lookup** | Narrow question about 1 file, symbol, config, or existing spec requirement | Select a fast/lightweight model (`*-flash*`, `*-lightning*`, or `*-free`) | `minimal` or `low` |
   | **Tier 1: Scoped Inquiry** | 1–2 modules; tracing an existing flow, clarifying a single capability, or summarizing a change | Select a fast general model (`*-flash*` or standard tier) | `low` or `medium` |
   | **Tier 2: Tradeoff & Design Exploration** | 2–5 modules; comparing architectural options, mapping integration points, or diagnosing a complex bug | Select a strong code/reasoning model (capable `*-flash` with `high`/`max` ceiling, contributor, or `*-ultra*`) | `high` |
   | **Tier 3: Deep Architectural / Cross-Cutting** | System-wide architecture, greenfield subsystem design, concurrency/state machines, or multi-spec reconciliation | Select a flagship model (`*-pro*`, `*-ultra*`, or a reasoning model supporting `xhigh`/`max`) | `high`, `xhigh`, or `max` |

3. **Snap `--level` to the Model's Allowed Array**:
   Verify that your target thinking level exists in the chosen model's array from Step 2.1 (`{"<selected-model>": [...]}`):
   - **Exact Match**: If the target level is present in the model's array, use it directly.
   - **Nearest Valid Level (Snapping)**: If a model omits an intermediate level (e.g., supporting `["low", "high", "max"]` without `"medium"`, or only supporting `["high"]`), snap to the nearest valid level in its array—rounding **up** for design/tradeoff analysis and **down** for simple lookups. Never pass a thinking level omitted from that model's Step 2.1 array.

4. **Spawn Explore Runner**:
   Derive a unique kebab-case `<session-slug>` per delegation (request slug or target change name plus a short suffix so concurrent delegations never collide) and execute the bridge runner with single quotes around `--request`:
   ```bash
   bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode explore --session "<session-slug>" --model "<model>" --level "<level>" --request '<request>'
   ```
   - Validates `--model` and `--level` against `references/models.json` and spawns `pi -a --session-id "openspec-explore-<session-slug>" --mode rpc`
   - Transmits `/skill:openspec-explore <request>` over stdin along with a strict read-only report mandate (forbidding file or OpenSpec artifact writes)
   - Filters raw token deltas, emitting clean tool progress logs (`⚙ [pi:tool] Invoking: ...`) and capturing the worker's final markdown report between `[EXPLORE_REPORT_START]` and `[EXPLORE_REPORT_END]` upon `agent_settled`
   - *Progressive Disclosure*: Do **not** load [references/rpc-protocol.md](references/rpc-protocol.md) during normal execution; read it **only** if you need to diagnose malformed JSON-RPC framing or runner stream errors.

### Step 3: Triage Worker Settlement State

Evaluate the runner's exit status and captured worker response:

#### Case A: `[STATUS] COMPLETED`

The worker emitted `[EXPLORE_REPORT_START] ... [EXPLORE_REPORT_END]` with a complete exploration report or answer. Proceed directly to **Step 5: Read-Only Verification & Report Presentation**.

#### Case B: `[STATUS] PAUSED_FOR_CLARIFICATION`

The worker paused to ask a clarifying question, narrow an investigative branch, or ask whether to capture artifacts.

1. Read the worker's question from the runner log.
2. **Autonomous Supervisor Triage (Default)**:
   - **Artifact Capture Offers**: If the worker asks whether to scaffold a change (`openspec new change`) or write/update an OpenSpec artifact (`proposal.md`, `design.md`, `specs/`, `tasks.md`), **always refuse file creation** and resume with:
     ```bash
     bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode explore --session \"<session-slug>\" --request 'Do not create or modify any files or OpenSpec artifacts. Synthesize all findings, ASCII diagrams, tradeoff comparisons, and proposed specification/design details directly into your final markdown response.'
     ```
   - **Codebase, Spec, or Context Questions**: Cross-reference the worker's question against `openspec/config.yaml`, `openspec/specs/**/*.md`, `openspec/changes/**/*.md`, `AGENTS.md`, and the codebase using `Read` and `Grep`. Formulate a concise answer grounded in repository context and resume the worker (single-quoting the `--request` payload):
     ```bash
     bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode explore --session \"<session-slug>\" --request '<clarification-answer>'
     ```
   - Return to **Step 3** to inspect the next settlement state.
3. **Human Escalation (Last Resort)**:
   - Only if the worker's question requires a subjective product decision or external business constraint that cannot be inferred from the user's request, specs, or codebase, ask the user directly, then resume with `--mode explore --session \"<session-slug>\" --request '<user-answer>'` and return to **Step 3**.

#### Case C: `[STATUS] FAILED`

Worker exited with an error, stalled in a tool loop, or timed out.

1. Inspect stderr and diagnostic logs to classify the failure against the live registry from Step 2.1:
   - **Reasoning / Investigation Stall**: Retry once by stepping up to the next valid thinking level in the current model's array (e.g., `medium` -> `high` -> `xhigh`/`max`) or switching to a higher-tier model from Step 2.1.
   - **Provider Timeout / Rate Limit**: Retry once using an alternate model from Step 2.1 at an equivalent supported thinking level.
2. If the escalated retry also returns `[STATUS] FAILED`, halt and report the diagnostic details to the user.

### Step 4: Resume Iteration Loop

Repeat Step 3 until `[STATUS] COMPLETED` is reached with a complete exploration report or answer.

### Step 5: Read-Only Verification & Report Presentation

1. **Verify Read-Only Invariant**:
   Confirm that no project files or `openspec/` directories were created or modified during the worker session (if any write tool was invoked by mistake, revert the stray changes immediately).
2. **Present Exploration Report**:
   Present the worker's synthesized exploration report to the user—preserving its ASCII diagrams, architecture maps, tradeoff tables, and recommendations—along with a brief footer noting the `--model` and `--level` configuration used and optional next steps (e.g., `/openspec-propose` if the user wishes to turn the findings into a formal change).