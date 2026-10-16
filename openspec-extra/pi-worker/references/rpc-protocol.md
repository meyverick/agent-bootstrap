# Pi JSON-RPC Protocol Reference (pi worker bridges)

Shared framing, lifecycle events, and output contract for `scripts/pi-rpc.ts` across all three modes controlling headless `pi` subprocesses. Workflow-specific bindings are marked **(apply)** / **(explore)** / **(prompt)**.

## Process Invocation Flags

- `-a` (`--approve`): Auto-approves workspace tool operations within project scope, preventing interactive TTY prompts. **(apply)**
- `-a` (`--approve`): Auto-approves read-only tool operations within workspace scope, preventing interactive TTY prompts. **(explore)**
- `--session-id "<id>"` **(all modes)**: Caller-owned session identity, passed through unchanged. Fresh delegations use a fresh unique id (convention: `openspec-<slug>`); follow-ups reuse it verbatim, including across modes. Syntax `^[a-z]+(?:-[a-z]+)*$`; invalid ids are rejected before launch.
- `--model "<model>"` and `--level "<level>"`: User-selected model and thinking depth passed straight through to `pi --model` and `pi --thinking`.
- `--mode rpc`: Activates bidirectional newline-delimited JSON-RPC streaming over standard I/O.

- Uniqueness is the caller's job: reusing an id across concurrent delegations interleaves their sessions.

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
  "message": "/skill:openspec-explore <prompt>\n\n[SUPERVISOR MANDATE: Operate strictly in read-only exploration mode...]"
}
```
*Note*: `pi` natively expands `/skill:openspec-explore` prior to session execution.

### Initial Prompt Command (prompt)
Sends the `--prompt` text unchanged with no skill prefix or mandate:
```json
{
  "id": "prompt-1710000000000",
  "type": "prompt",
  "message": "<text>"
}
```
The runner frames the settled response between `[PROMPT_RESPONSE_START]` and `[PROMPT_RESPONSE_END]` and reports `[STATUS] COMPLETED` (empty output is `FAILED`).


### Clarification / Triage Reply Command (all modes via prompt)
Resumes a paused `apply`, `explore`, or `prompt` session (`--mode prompt --session "<id>" --prompt '<answer>'`) by sending the answer raw into the existing session without re-expanding `/skill:*` or re-attaching a supervisor mandate:
```json
{
  "id": "prompt-1710000050000",
  "type": "prompt",
  "message": "<clarification-answer>"
}
```
*Note*: After a `--mode prompt` follow-up to an `apply` session settles with `[STATUS] COMPLETED`, the supervisor runs `openspec instructions apply --change "<change-name>" --json` to verify whether `progress.remaining === 0` before treating the apply workflow as complete.

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

### Settlement (prompt)

1. **`message_update` (suppressed by runner)**:
   Emits high-frequency token deltas (`text_delta`, `thinking_delta`). The runner discards these to prevent supervisor context bloat.
2. **`toolcall_start` / `toolcall_end` & `message_end`**:
   Logs tool invocations/completions and captures the assistant turn text into `lastAssistantMessage`.
3. **`agent_settled`**:
   Emitted when the worker finishes its turn loop. Prints `lastAssistantMessage` between `[PROMPT_RESPONSE_START]` and `[PROMPT_RESPONSE_END]` and emits:
   - `[STATUS] COMPLETED: prompt response delivered.` (for any non-empty response, including responses ending with `?`).
   - `[STATUS] FAILED`: Worker crashed, timed out, or settled with an empty response.

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

Explore and prompt modes differ in `confirm`: `confirm` requests resolve to `false` so the worker never receives implicit extension UI confirmation:
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
- **Channel Separation (prompt)**: Stdout carries clean runner progress, `[PROMPT_RESPONSE_START] ... [PROMPT_RESPONSE_END]`, and `[STATUS]`; raw diagnostics route to stderr.