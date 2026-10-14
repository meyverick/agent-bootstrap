---
name: pi-worker
description: >
  Delegate OpenSpec work to a headless pi worker over JSON-RPC: apply a change's
  tasks, explore and investigate strictly read-only, or send raw prompts.
  Use when the user says "pi apply", "opsx pi apply", "pi explore",
  "opsx pi explore", or "pi worker".
  Do NOT use when applying or exploring directly in the host agent
  (use openspec-apply-change or openspec-explore).
allowed-tools: Bash(bun:*) Bash(openspec:*) Read Grep
license: MIT
compatibility: Requires pi CLI, bun, and openspec CLI.
metadata:
  author: agentic
  version: "1.0.0"
---

# Pi Worker — headless `pi` delegation (apply | explore)

One bridge, three modes. The host agent stays supervisor: it scopes the delegation, picks the
mode, resolves model and level from the live registry, triages settlement, and verifies the
outcome. The worker executes in an isolated session over JSON-RPC.

> **Path Resolution**: All `scripts/` and `references/` paths below are relative to this
> skill's directory (e.g. `.agents/skills/pi-worker/`). Resolve them against the skill's
> base directory when invoking commands from the workspace root.

## Mode selection

| User intent | Mode | Directive to read (and follow) |
| :--- | :--- | :--- |
| Implement a change's pending tasks | `--mode apply` | [references/openspec-pi-apply.md](references/openspec-pi-apply.md) |
| Investigate / compare / brainstorm (read-only) | `--mode explore` | [references/openspec-pi-explore.md](references/openspec-pi-explore.md) |
| Raw prompt: generic question, or follow-up to any existing session | `--mode prompt` | No directive: the `--prompt` text is sent unchanged |

Read the chosen mode directive and follow its workflow steps (`prompt` mode has no external
directive: for fresh `--mode prompt` turns, query `scripts/pi-rpc.ts --model` first and select
a model and valid `--level` matching complexity — lightweight `*-flash*`/`*-free` with
`minimal`/`low` for simple queries, standard/reasoning with `medium`/`high` for code analysis,
or flagship `*-pro*`/`*-ultra*` with `high`/`xhigh`/`max` for deep architecture; for follow-ups
to a paused `apply` or `explore` session, reuse `--session "<id>"` with `--mode prompt`).
All modes drive the same
runner, [scripts/pi-rpc.ts](scripts/pi-rpc.ts); protocol internals live in
[references/rpc-protocol.md](references/rpc-protocol.md) (progressive disclosure: load it
only to diagnose malformed framing or runner stream errors).

## Invocation contract

```bash
bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode apply   --session "<id>" --model "<model>" --level "<level>" --prompt "<change-name>"
bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode explore --session "<id>" --model "<model>" --level "<level>" --prompt '<prompt>'
bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode prompt  --session "<id>" --model "<model>" --level "<level>" --prompt '<text>'
```

- `--mode <apply|explore|prompt>` — required for a turn. **Missing `--mode` prints the JSON mode
  catalog** `{"apply": "<directive>", "explore": "<directive>", "prompt": "<description>"}`;
  an invalid value errors listing valid modes.
- `--model` / `--level` — query the live registry first (`scripts/pi-rpc.ts --model` emits
  `{"<model>":["level",...]}`; single source of truth). Aliases `--models` and `--list-models`
  behave identically. `--level` is validated against the
  model's allowed array and forwarded to pi's `--thinking`.
- `--session <id>` — always required: the exact caller-owned Pi session id, passed through
  unchanged (the bridge derives nothing). Fresh inquiry → fresh unique id; follow-ups reuse
  it verbatim — including across modes (`prompt` continues an apply/explore session).
  Convention (not enforced): `openspec-<slug>`. Syntax enforced (`^[a-z]+(?:-[a-z]+)*$`):
  strictly lowercase `a-z` words separated by single hyphens; digits, underscores, uppercase,
  and leading/trailing hyphens error (if a name contains digits such as `oauth2`, spell them
  out in the session id, e.g. `openspec-oauth-two-a`). There is **no `--reply` / `--continue`**:
  resuming a paused worker reuses the exact `--session "<id>"` with `--mode prompt` and a new
  `--prompt` carrying the answer.
- `--prompt` — apply takes the OpenSpec change name; explore/prompt take the free-text prompt.
  Prompt mode sends it unchanged (no skill prefix, no mandate). Wrap payloads in single
  quotes (backticks/`$` would be subshell-evaluated). `--request` was removed and errors.
- `--timeout <ms>`, `--root <path>`, `--verbose` — optional runner controls.

Settlement delimiters: reports arrive between `[APPLY_REPORT_START]`/`[APPLY_REPORT_END]`,
`[EXPLORE_REPORT_START]`/`[EXPLORE_REPORT_END]`, or `[PROMPT_RESPONSE_START]`/
`[PROMPT_RESPONSE_END]` (prompt always reports `COMPLETED`; empty output is `FAILED`),
followed by a terminal
`[STATUS] COMPLETED | PAUSED_FOR_CLARIFICATION | FAILED`.

## Gotchas & Anti-Examples

- **Do NOT reuse a session id across concurrent delegations** — it interleaves their sessions.
- **Prompt mode is raw**: no read-only guard and no task gate — use it for generic turns
  and cross-mode follow-ups, never as a leash-free substitute for explore/apply.
- **Do NOT pipe raw `pi` stdout** into conversational logs; read the runner's filtered events.
- **Explore is strictly read-only**: neither worker nor supervisor writes in that mode; if the
  user asks to scaffold, switch to `--mode apply`'s directive context or direct them to
  `/openspec-propose` / direct apply.
- **Do NOT select a model before assessing scope**, and never hardcode model names: always
  query `--model` discovery first.
- **Do NOT treat a worker claim or a `--mode prompt` turn's `COMPLETED` status as apply completion**:
  apply is verified against `openspec instructions apply --change "<name>" --json` (`remaining: 0`),
  including after every `--mode prompt` follow-up turn; explore ends with a report (or a blocking question).
