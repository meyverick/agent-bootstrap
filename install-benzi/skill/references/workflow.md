# Workflow: compile → query → edit-gate → verify

Self-contained reference. Read from `SKILL.md` route step 2.

## The loop

1. **Compile.** Tree-sitter parses every file, resolves imports, builds class ancestry, traces identifiers to definitions. Output is an index, not text. Happens once, then incrementally.
2. **Query.** Read and plan through structured tools over the index — never grep-first when the index can answer.
3. **Edit, gated.** Every write is checked against the real parser; a broken parse **auto-reverts**. Blast radius (changed symbol, its callers, its holders, relevant tests) checked going in and again once the write lands.
4. **Verify by running it.** Focused repro under the runtime tracer alongside blast-radius-flagged tests. Real values, real dispatch — this proves the change and collapses ambiguous edges onto whatever target actually fired.
5. **Reindex, incrementally.** Every turn re-parses only what changed on disk — your edits and the agent's, treated the same.
6. **Revert from snapshot.** Every write snapshots the index first; undo reloads the snapshot instead of re-deriving it.
7. **Back to 2.** The next question answers against the code as it is now.

## How to drive it

- Answer whole-repo questions from the index first; open files only for what the map can't say (intent, business logic).
- Before an edit: pull blast radius, state it (what breaks if this lands), then write.
- After an edit: let the gated write + incremental sweep run; verify with `execute_from`/tests rather than re-reading.
- Ambiguous edge (`candidate`): keep the bounded set visible; a run (`observed`) is the only thing that narrows it.
- Bad state: `rollback_edit` (snapshot reload), not manual re-editing.

## Boundaries

- No build needed; works on half-finished code (unparsed paths show as `unindexed` with the reason).
- MCP surface = index tools + gated write tools (`edit_lines`/`create_file`); running, UI selection, and cross-session memory stay with the host harness — bring your own exec tools.
- Edit-gate auto-revert protects parse validity only; semantic correctness still needs the verify step (4).
