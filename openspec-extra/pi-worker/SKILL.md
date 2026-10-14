---
name: pi-worker
description: >
  Delegate OpenSpec work to a headless pi worker over JSON-RPC: apply a change's
  tasks, or explore and investigate strictly read-only.
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

One bridge, two modes. The host agent stays supervisor: it scopes the delegation, picks the
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

Read the chosen mode directive and follow its workflow steps. Both modes drive the same
runner, [scripts/pi-rpc.ts](scripts/pi-rpc.ts); protocol internals live in
[references/rpc-protocol.md](references/rpc-protocol.md) (progressive disclosure: load it
only to diagnose malformed framing or runner stream errors).

## Invocation contract

```bash
bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode apply   --session "<slug>" --model "<model>" --level "<level>" --request "<change-name>"
bun run .agents/skills/pi-worker/scripts/pi-rpc.ts --mode explore --session "<slug>" --model "<model>" --level "<level>" --request '<request>'
```

- `--mode <apply|explore>` — required for a turn. **Missing `--mode` prints the JSON mode
  catalog** `{"explore": "<directive>", "apply": "<directive>"}`; an invalid value errors
  listing valid modes.
- `--model` / `--level` — query the live registry first (`scripts/pi-rpc.ts --model` emits
  `{"<model>":["level",...]}`; single source of truth). Aliases `--models` and `--list-models`
  behave identically. `--level` is validated against the
  model's allowed array and forwarded to pi's `--thinking`.
- `--session <slug>` — always required: delegation identity AND routing key. Fresh inquiry →
  fresh unique slug; follow-ups reuse it. There is **no `--reply` / `--continue`**: resuming a
  paused worker is the same session with a new `--request` carrying the answer.
- `--request` — mode-dependent meaning: apply takes the OpenSpec change name; explore takes
  the free-text request. Wrap payloads in single quotes (backticks/`$` would be subshell-evaluated).
- `--timeout <ms>`, `--root <path>`, `--verbose` — optional runner controls.

Settlement delimiters: reports arrive between `[APPLY_REPORT_START]`/`[APPLY_REPORT_END]` or
`[EXPLORE_REPORT_START]`/`[EXPLORE_REPORT_END]`, followed by a terminal
`[STATUS] COMPLETED | PAUSED_FOR_CLARIFICATION | FAILED`.

## Gotchas & Anti-Examples

- **Do NOT reuse a slug across concurrent delegations** — it interleaves their sessions.
- **Do NOT pipe raw `pi` stdout** into conversational logs; read the runner's filtered events.
- **Explore is strictly read-only**: neither worker nor supervisor writes in that mode; if the
  user asks to scaffold, switch to `--mode apply`'s directive context or direct them to
  `/openspec-propose` / direct apply.
- **Do NOT select a model before assessing scope**, and never hardcode model names: always
  query `--model` discovery first.
- **Do NOT treat a worker claim as completion**: apply is verified against
  `openspec instructions apply --change "<name>" --json` (task counts); explore ends with a
  report (or a blocking question).
