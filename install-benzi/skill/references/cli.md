# CLI & auth

Self-contained reference. Read from `SKILL.md` route step 3.

## Surfaces

| Surface | Entry | Needs |
|---|---|---|
| MCP (index only) | `benzi-mcp` (stdio) | `benzi-login` once |
| Headless agent (scripts/CI) | `benzi-headless <repo> "<question>"` | `benzi-login` once |
| Interactive auth/config | `benzi-login` | **user action — never spawned by agents/installers** |

All surfaces share one config. MCP roots at its spawn CWD when no repo arg is given — one global registration serves every project.

## benzi-login (one-time, interactive)

Email → code → token. Also updates model or key later. Never run it from an agent flow or installer: it prompts on stdin (email code) and would hang/fail in a closed-stdin spawn. Surface the hint instead:

> Run `benzi-login` once (interactive email code) before using the MCP server or headless CLI.

## Config: `~/.benzi/config.json`

- `token` / `email` — session from the email-code flow
- `model` — default model when a surface doesn't specify one
- `api_keys` — BYOK keys per provider env-name (e.g. the provider's `*_API_KEY`)
- Written atomically by benzi itself (tmp + replace). Never edit by hand, never copy values into project files, never log them.
- Override path via `BENZI_CONFIG_PATH`; API base via `BENZI_API_BASE` (env, machine-level — not project config).

## Failure modes

| Symptom | Meaning | Action |
|---|---|---|
| MCP fails at startup: no/invalid config | `benzi-login` never run | tell user to run it once |
| `benzi-mcp` not found | package not installed | installer path: `uv tool install benzi` |
| uv missing | installer gate failed | install uv, re-run installer |
| model/key rejected at query time | stale BYOK key | user: `benzi-login` to update the key |
| answer thin for a language | uneven grammar coverage | state the gap; open upstream issue with repo+question |

## Headless example

```bash
benzi-headless /path/to/repo "why does checkout double-apply the discount"
```

Exit path uses the same index + agent loop as the editor surface; output is the agent's answer plus tool trace. BYOK: charges your own model provider, not a benzi account (beta is free).
