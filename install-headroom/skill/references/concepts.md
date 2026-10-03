# Chapter 3 — Concepts & Setup

Self-contained reference. Read for install channels, update semantics, data path, telemetry, and scope limits.

## Install channels

- **CLI channel (what this environment uses):** `uv tool install "headroom-ai[all]"` — isolated app env, no sudo, upstream-recommended. `pipx` is the alternative; bare `pip` hits PEP 668 on modern distros.
- **npm `headroom-ai`** = TypeScript SDK (library `compress()`), **no CLI** — installing it never produces a `headroom` command.
- Python >=3.10 (upstream examples pin 3.13).

## Update semantics (known sharp edge)

- `headroom update` detects pipx / uv tool / pip and upgrades in place;
  **requires `-y` non-interactively** (otherwise it prompts `[Y/n]` and aborts
  on closed stdin).
- It refuses git checkouts, editable installs, Docker, and system Python —
  printing guidance (the installer surfaces that verbatim).
- **False-success hazard:** it prints "Headroom upgraded to X" even when the
  underlying resolver kept the installed version. Platform wheel gaps do this —
  observed on Intel macOS: `onnxruntime` newer releases ship no `macosx x86_64`
  wheel, so uv backtracks to the newest *installable* release (0.35.0 while
  PyPI said 0.39.1). Always re-check `headroom --version` after an update
  rather than trusting the message.
- Upstream also has `headroom update --check` (report-only).

## Local-first data path

Library, proxy, and MCP server compress **on your machine** — no prompt or file
content is sent anywhere to be compressed. What *does* leave: the model provider
receives the compressed text exactly as it would the original (compression
shrinks it, it does not localize the model call). Consequently:

- **Never feed secrets assuming compression hides them** — the compressed form
  still carries them semantically. Strip secrets before compressing, same as
  before sending.
- CCR originals stay in the local cache — reversible, never uploaded.

## Telemetry (opt-IN)

Anonymous usage telemetry is **off by default**. Enabling = user policy:
`HEADROOM_TELEMETRY=on` or `headroom proxy --telemetry`. Agents never set these.

## When NOT to use headroom

- **Small content** — router overhead exceeds savings.
- **Already-compressed payloads** (base64/gzip/zip) — nothing to reclaim.
- **Secrets / credentials** — redact first, compress second (or not at all).
- **No MCP server + no CLI need** — native paste is fine for one-liners.
- **Exact-byte assertions** — retrieve the original first (chapter 2).

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| MCP tools absent | server not registered / CLI missing | installer registers `headroom mcp serve`; check `mcpServers.headroom` |
| Update "succeeds" but version unchanged | platform wheel gap (see above) | accept newest-installable; verify with `headroom --version` |
| Prompt hangs on update | missing `-y` | user runs `headroom update -y` |
| Compressed text misread as source | lossy by design | `headroom_retrieve` the original (chapter 2) |

Next: back to the syllabus — [../SKILL.md](../SKILL.md).
