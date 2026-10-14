# Pi JSON-RPC Protocol Reference (pi worker bridges)

Shared framing, lifecycle events, and output contract for `scripts/pi-rpc.ts` across both modes controlling headless `pi` subprocesses. Workflow-specific bindings are marked **(apply)** / **(explore)**.

## Process Invocation Flags

- `-a` (`--approve`): Auto-approves workspace tool operations within project scope, preventing interactive TTY prompts. **(apply)**
- `-a` (`--approve`): Auto-approves read-only tool operations within workspace scope, preventing interactive TTY prompts. **(explore)**
- `--session-id "openspec-apply-<slug>"` **(apply)**: Enforces change-scoped session isolation. Reuses the exact session across `--request` follow-up turns without colliding with concurrent exploration or other change sessions.
- `--model "<provider>/<model>"` and `--level "<level>"`: Canonical model and thinking depth validated against `references/models.json`.
- `--mode rpc`: Activates bidirectional newline-delimited JSON-RPC streaming over standard I/O.

- `--session-id "openspec-explore-<session-slug>"`: **(explore)** Delegation-scoped session isolation. Reuses the exact session across `--request` follow-up turns without colliding with concurrent exploration or apply sessions.

## Standard Input Commands

### Initial Prompt Command (apply)
Transmits the `openspec-apply-change` skill invocation and supervisor mandate to `pi`:
```json
{
  "id": "prompt-1710000000000",
  "type": "prompt",
  "message": "/skill:openspec-apply-change <change-name>\n\n[SUPERVISOR MANDATE: Implement the pending tasks for this OpenSpec change...]"
}
```
*Note*: `pi` natively expands `/skill:openspec-apply-change` prior to session execution.


### Initial Prompt Command (explore)
Transmits the `openspec-explore` skill invocation and read-only supervisor mandate to `pi`:
```json
{
  "id": "prompt-1710000000000",
  "type": "prompt",
  "message": "/skill:openspec-explore <request>\n\n[SUPERVISOR MANDATE: Operate strictly in read-only exploration mode...]"
}
```
*Note*: `pi` natively expands `/skill:openspec-explore` prior to session execution.


### Clarification / Triage Reply Command (apply)
Resumes a paused apply session (`--session "<slug>" --request '<answer>'`) with specification context or instructions to mark completed checkboxes in `tasks.md`:
```json
{
  "id": "prompt-1710000050000",
  "type": "prompt",
  "message": "<clarification-answer>\n\n[SUPERVISOR MANDATE: Implement the pending tasks for this OpenSpec change...]"
}
```


### Clarification / Triage Reply Command (explore)
Resumes a paused exploration session (`--mode explore --session \"<session-slug>\" --request '<answer>'`) with repository context or a refusal to write artifacts:
```json
{
  "id": "prompt-1710000050000",
  "type": "prompt",
  "message": "<clarification-answer>\n\n[SUPERVISOR MANDATE: Operate strictly in read-only exploration mode...]"
}
```

## Protocol Record Families

The protocol communicates via LF-terminated (`\n`) JSON objects across four record families:

| Direction | Record Family | Purpose |
| :--- | :--- | :--- |
| **stdin** | Command | Prompt submission, clarification replies, and session control |
| **stdout** | Response | Command acknowledgement (`success: true|false`), data payload, or error |
| **stdout** | Session Event | Real-time run lifecycle, tool calls, message completions, and settlement |
| **bidirectional** | Extension UI | Dialog requests (`select`, `confirm`, `input`, `editor`) and matching responses |
## Event Stream, Filtering & Settlement

### Settlement (apply)

1. **`message_update` (suppressed by runner)**:
   Emits high-frequency token deltas (`text_delta`, `thinking_delta`). The runner discards these to prevent supervisor context bloat and pipe buffer stalls.
2. **`toolcall_start` / `toolcall_end`**:
   Emitted when `pi` invokes or completes workspace tools:
   - `⚙ [pi:tool] Invoking: <tool-name>`
   - `✓ [pi:tool] Completed: <tool-name>`
3. **`message_end`**:
   Emitted when the assistant completes a message turn. Captured into `lastAssistantMessage`.
4. **`agent_settled`**:
   Emitted when the worker finishes its turn loop. The runner:
   - Prints `lastAssistantMessage` between `[APPLY_REPORT_START]` and `[APPLY_REPORT_END]`.
   - Executes `openspec instructions apply --change "<change-name>" --json` to inspect `progress.remaining` and `progress.total`.
   - Emits the terminal `[STATUS]` line:
     - `[STATUS] COMPLETED`: `progress.total > 0` and `progress.remaining === 0`.
     - `[STATUS] PAUSED_FOR_CLARIFICATION`: `progress.remaining > 0` (prints up to 5 pending tasks and the worker's last message/question).
     - `[STATUS] FAILED`: Worker crashed, timed out, rejected an RPC command, or `openspec instructions apply` failed.

### Settlement (explore)

1. **`message_update` (suppressed by runner)**:
   Emits high-frequency token deltas (`text_delta`, `thinking_delta`). The runner discards these to prevent supervisor context bloat.
2. **`toolcall_start` / `toolcall_end`**:
   Emitted when `pi` invokes or completes workspace tools:
   - `⚙ [pi:tool] Invoking: <tool-name>`
   - `✓ [pi:tool] Completed: <tool-name>`
   - **Read-Only Guardrail**: If `<tool-name>` matches a mutating tool (`Write`, `Edit`, `MultiEdit`, `create_file`, `delete_file`), the runner aborts the worker immediately and emits `[STATUS] FAILED`.
3. **`message_end`**:
   Emitted when the assistant completes a message turn. Captured into `lastAssistantMessage`.
4. **`agent_settled`**:
   Emitted when the worker finishes its turn loop. Triggers report emission between `[EXPLORE_REPORT_START]` and `[EXPLORE_REPORT_END]` followed by the terminal `[STATUS]` line:
   - `[STATUS] COMPLETED`: Substantive exploration report delivered.
   - `[STATUS] PAUSED_FOR_CLARIFICATION`: Worker paused with a blocking question for the supervisor.
   - `[STATUS] FAILED`: Worker crashed, timed out, returned an empty report, or violated the read-only guardrail.

## Extension UI Sub-Protocol

Interactive extensions may emit `extension_ui_request` on stdout:
```json
{
  "type": "extension_ui_request",
  "id": "req-123",
  "method": "confirm"
}
```
In apply mode, the runner auto-resolves dialog requests on stdin using default/prefilled values (`true` for `confirm`, first option for `select`) so headless implementation never deadlocks on a TTY prompt:
```json
{
  "type": "extension_ui_response",
  "id": "req-123",
  "value": true
}
```

Explore differs in exactly one value: `confirm` requests resolve to `false` so the worker never receives implicit permission to scaffold or write OpenSpec artifacts:
```json
{
  "type": "extension_ui_response",
  "id": "req-123",
  "value": false
}
```

## Framing & Backpressure Rules

- **Strict LF Boundaries**: Records are newline-delimited JSON (`\n`). Carriage returns (`\r`) are stripped prior to JSON parsing.
- **Continuous Drain**: Stdout is drained continuously via stream listeners to avoid backpressure stalls.
- **Channel Separation (apply)**: Stdout carries clean runner progress, `[APPLY_REPORT_START] ... [APPLY_REPORT_END]`, and `[STATUS]`; raw diagnostics route to stderr.
- **Channel Separation (explore)**: Stdout carries clean runner progress, `[EXPLORE_REPORT_START] ... [EXPLORE_REPORT_END]`, and `[STATUS]`; raw diagnostics route to stderr.