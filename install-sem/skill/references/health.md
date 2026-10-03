# Chapter 4 — Setup, Health & Hazards

Self-contained reference. Read when installing sem, verifying PATH, or hitting environment problems.

## Install & verify

```bash
npm install -g @ataraxy-labs/sem   # cross-platform (node >= 20)
sem --version                      # MUST print: sem <X.Y.Z>
```

Other official channels: `install.sh` (macOS/Linux, checksum-verified),
`brew install sem-cli`, `winget install AtaraxyLabs.sem`, `scoop install sem`,
`cargo install sem-cli`. Update any time with `sem update` (self-update,
no-op when current).

## Hazard: GNU Parallel's colliding `sem`

GNU Parallel ships `/usr/bin/sem` as a symlink to `parallel`. If both are
installed, `sem` on PATH may be the wrong binary — it affects the CLI **and**
the MCP server (clients spawn whatever PATH resolves).

Check: `sem --version` must print `sem X.Y.Z`. Anything else (parallel-flavored
output) = collision.

Fix (pick one):

```bash
alias sem="$HOME/.local/bin/sem"        # in ~/.bashrc / ~/.zshrc
export PATH="$HOME/.cargo/bin:$PATH"    # cargo-installed sem first
```

Then re-verify. Upstream issue reference: Ataraxy-Labs/sem#77.

## Hazard: `sem setup` replaces `git diff` globally

```bash
sem setup      # DANGER: globally aliases git diff -> sem diff
sem unsetup    # reverses
```

Never run `sem setup`/`unsetup` without an explicit user request — it changes
behavior of `git diff` across the whole machine. The installer never invokes it.

## Cold index behavior (not a hang)

- `sem find`, `sem callers`, `sem refs`, `sem grep` answer from an mmap query
  index when present (<10ms / <50ms targets on large repos).
- First run builds the index, then persists it. Slow first call on a big repo
  is expected; subsequent calls are fast.
- Stale after big edits? Re-run the command; index freshness follows the
  command's own discipline (fall back to fresh build when needed).

## Opt-in only (never automated)

- `sem login` / `logout` / `whoami` — sem cloud identity.
- `sem cloud` — per-repo cloud acceleration (off by default).
- `sem review` — agent attach to cloud code review.
- `sem telemetry` — anonymous usage telemetry (local by default).
- `sem xref` / `sem repos` — cloud-indexed cross-repo queries.

Cloud queries are opt-in per repo: login does not upload the repo. Consent
flow and audit controls live in upstream docs (`docs/cloud-consent.html`).

## Failure matrix

| Symptom | First action |
|---------|--------------|
| `sem` not found | install (above), check PATH |
| `sem --version` prints parallel output | collision fix (above) |
| First `find`/`grep` slow | wait for index build; re-run |
| MCP tools missing in client | verify `mcpServers.sem` config, args `["mcp"]` |
| `sem update` fails (offline) | network required for update only; local binary unaffected |
| Unexpected `git diff` behavior | check whether `sem setup` was run → `sem unsetup` |
