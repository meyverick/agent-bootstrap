# Tools & index states

Self-contained reference. Read from `SKILL.md` route step 1.

## The six states

Every call site and file carries exactly one — the anti-guessing contract:

| State | Meaning |
|---|---|
| `resolved` | proven in-repo edge |
| `external` | into a library, with import evidence |
| `candidate` | ambiguous — bounded set of possible targets kept in full |
| `unresolved` | seen but not settled, carries *why* |
| `observed` | confirmed by an actual run (runtime tracer) |
| `unindexed` | never parsed, with the reason |

Rule: whatever static analysis can't settle is flagged, not guessed. Running the program is what settles it (`observed`).

## Headline MCP tools (16 of 35+)

| Tool | Answers |
|---|---|
| `get_callers` | every call site that reaches a function — the code that will feel a change |
| `call_tree` | transitive call closure from one function, forward or reverse |
| `trace_path` | call chain connecting two functions + the data carried along it |
| `external_calls` | which libraries a scope leans on, and where it calls into them |
| `forwardflow` | where a function's return value ends up, everywhere it must match |
| `backflow` | where a wrong value came from, without opening every caller |
| `profile` | full 360 on one symbol in one call |
| `get_definition` | declaration card — signature, docs, location |
| `search_symbols` | case-insensitive substring search across every symbol |
| `get_hierarchy` | type's resolved bases and direct subclasses |
| `skim_source` | body's one-level outline — which lines are worth reading |
| `execute_from` | run a file under the call tracer, record what actually happened |
| `check_last_execution` | read back the last recorded run's facts, no re-run |
| `execute_generated_testcase` | write a self-contained repro and run it |
| `rollback_edit` | undo last writes by snapshot reload, not re-editing |
| `upgrade_to_pro` | escalate to a larger reasoning budget mid-task |

## Choosing a query

- "who will feel this change" → `get_callers` (+ `call_tree` for closure)
- "where did this bad value come from" → `backflow`
- "does the return reach its consumers correctly" → `forwardflow`
- "what is this symbol" → `profile` (or `get_definition` for just the card)
- "show me the shape before reading" → `skim_source`
- "is this call site real" → check its state; `candidate` = present the set, `observed` = settled by a run

## Language coverage

Python (deepest, only runtime tracer), JS, TS, Java, C#, C++, C, Go, Rust, Ruby + markup engine (HTML/CSS/DOM-JS). Incremental reindex slower for C/C++/Rust/Ruby. Thin answer for a language = construct not modelled yet — say so, don't paper over it.
