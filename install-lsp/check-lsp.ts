#!/usr/bin/env bun
// check-lsp.ts — health-check for an lsp.json LSP config (kit-side dev tool).
// Usage: bun check-lsp.ts [path/to/lsp.json]   (default: lsp.json next to this script)
// Validates config shape, then performs one LSP `initialize` handshake per
// declared server with a per-server timeout (retry-once on timeouts only).
// Exit 0 when every server answers; non-zero otherwise. This is what would
// have caught the feature-stripped taplo binary and the hanging ruff server.
import { join, resolve } from "node:path";

const scriptDir = new URL(".", import.meta.url).pathname;
const configPath = Bun.argv[2] ? resolve(process.cwd(), Bun.argv[2]) : join(scriptDir, "lsp.json");
const TIMEOUT_MS = 30000;

// Mirror of install.ts LSP_NPM keys + LSP_CHANNELS (bin -> channel kind).
// Update together: an unknown bin here fails the run by design.
const CHANNELS: Record<string, string> = {
  "typescript-language-server": "npm",
  svelteserver: "npm",
  "vscode-json-language-server": "npm",
  "vscode-html-language-server": "npm",
  "yaml-language-server": "npm",
  "gh-actions-language-server": "npm",
  "tailwindcss-language-server": "npm",
  "sql-language-server": "npm",
  biome: "npm",
  "docker-langserver": "npm",
  "bash-language-server": "npm",
  "pyright-langserver": "npm",
  buf: "npm",
  "rust-analyzer": "rust",
  protols: "rust",
  taplo: "rust",
  marksman: "marksman",
  "csharp-ls": "dotnet",
  ruff: "uv",
};

let failed = 0;
const fail = (id: string, reason: string): void => {
  failed++;
  console.log(`FAIL ${id}: ${reason}`);
};

// ---- config shape ----
let cfg: { servers?: Array<Record<string, unknown>> };
try {
  cfg = JSON.parse(await Bun.file(configPath).text());
} catch (e) {
  console.log(`FAIL config: cannot parse ${configPath} (${e instanceof Error ? e.message : e})`);
  process.exit(1);
}
if (!cfg || !Array.isArray(cfg.servers)) {
  console.log("FAIL config: top-level servers[] missing");
  process.exit(1);
}
const seen = new Set<string>();
for (const [i, s] of cfg.servers.entries()) {
  const where = `servers[${i}]`;
  const id = typeof s?.id === "string" ? (s.id as string) : null;
  if (!id) fail(where, "missing/invalid required key: id");
  else {
    if (seen.has(id)) fail(where, `duplicate server id: ${id}`);
    seen.add(id);
  }
  if (typeof s?.bin !== "string") fail(id ?? where, "missing/invalid required key: bin");
  else if (!(s.bin in CHANNELS)) fail(id ?? where, `no known install channel for bin: ${s.bin}`);
  if (!Array.isArray(s?.args)) fail(id ?? where, "missing/invalid required key: args");
}
if (failed) process.exit(1);

// ---- handshakes (one frame read: the initialize response or error) ----
async function handshake(id: string, bin: string, args: string[]): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let proc: ReturnType<typeof Bun.spawn>;
    try {
      proc = Bun.spawn([bin, ...args], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    } catch (e) {
      fail(id, `spawn failed (attempt ${attempt}): ${e instanceof Error ? e.message : e}`);
      return; // missing binary: no retry, nothing to wait for
    }
    // A faithful client simulation: real clients send workspaceFolders and
    // initializationOptions (pi-lsp sends both), and some servers reject a bare
    // initialize that omits them.
    const rootUri = `file://${scriptDir}`;
    const init = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        // Real parent PID, mirroring pi-lsp: some servers (observed: marksman)
        // never answer initialize when processId is null.
        processId: process.pid,
        rootUri,
        capabilities: {},
        initializationOptions: {},
        workspaceFolders: [{ uri: rootUri, name: "lsp-check" }],
      },
    };
    const body = Buffer.from(JSON.stringify(init));
    proc.stdin.write(Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]));
    await proc.stdin.flush();
    // Drain stderr concurrently: a chatty server fills the pipe buffer and
    // stalls forever if nobody reads while we wait on stdout.
    const errChunks: Uint8Array[] = [];
    const errDrained = (async () => {
      try {
        const erdr = proc.stderr.getReader();
        for (;;) {
          const r = await erdr.read();
          if (r.done) break;
          errChunks.push(Buffer.from(r.value));
        }
        erdr.releaseLock();
      } catch {
        // stream torn down with the process: partial chunks are enough
      }
    })();
    const reader = proc.stdout.getReader();
    let buf = Buffer.alloc(0);
    const deadline = Date.now() + TIMEOUT_MS;
    let outcome: string | null = null;
    let eof = false;
    try {
      // Exactly one read is ever outstanding. A read abandoned to a tick keeps
      // consuming: a single-chunk response landing in it is lost forever while
      // later reads starve (observed: marksman answers at ~1s, exactly when the
      // first 1s tick fires). So the same pending read is re-awaited, never replaced.
      let pending: Promise<ReadableStreamReadResult<Uint8Array>> | null = null;
      while (Date.now() < deadline && outcome === null && !eof) {
        if (!pending) {
          pending = reader.read();
          pending.catch(() => {});
        }
        const remaining = deadline - Date.now();
        const res = await Promise.race([
          pending.then((r) => ({ kind: "data" as const, r })),
          new Promise<{ kind: "tick" }>((resolve) =>
            setTimeout(() => resolve({ kind: "tick" as const }), Math.min(remaining, 1000)),
          ),
        ]);
        if (res.kind === "tick") continue;
        pending = null;
        const r = res.r;
        if (r.done) {
          eof = true;
          break;
        }
        buf = Buffer.concat([buf, Buffer.from(r.value)]);
        // Consume complete Content-Length frames; server notifications are
        // skipped — only the id:1 response settles the outcome.
        for (;;) {
          const idx = buf.indexOf("\r\n\r\n");
          if (idx < 0) break; // need more data
          const head = buf.subarray(0, idx).toString("utf8");
          const hm = head.match(/content-length:\s*(\d+)/i);
          if (!hm) {
            buf = buf.subarray(idx + 4); // non-frame bytes: skip, keep scanning
            continue;
          }
          const n = parseInt(hm[1], 10);
          if (buf.length < idx + 4 + n) break; // need more data
          const frame = buf.subarray(idx + 4, idx + 4 + n);
          buf = buf.subarray(idx + 4 + n);
          let msg: any = null;
          try {
            msg = JSON.parse(frame.toString("utf8"));
          } catch {
            continue; // corrupt frame: keep scanning
          }
          if (msg?.id === 1) {
            outcome =
              msg.result?.capabilities !== undefined
                ? "ok"
                : `answered without capabilities: ${JSON.stringify(msg.error ?? msg).slice(0, 120)}`;
            break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    // Settle process state before inspecting output: `exitCode` may lag behind
    // EOF, so wait for the authoritative `exited` signal (bounded) first.
    if (eof || outcome !== null) {
      await Promise.race([proc.exited, new Promise((res) => setTimeout(res, 2000))]);
    }
    const code = proc.exitCode;
    proc.kill();
    await Promise.race([errDrained, new Promise((res) => setTimeout(res, 2000))]);
    const lastLine = Buffer.concat(errChunks).toString("utf8").trim().split("\n").slice(-1)[0].slice(0, 160);
    if (outcome === "ok") {
      console.log(`OK ${id}${attempt > 1 ? ` (retry ${attempt})` : ""}`);
      return;
    }
    if (outcome !== null) {
      fail(id, outcome); // hard answer (error / no capabilities): no retry
      return;
    }
    if (code !== null) {
      fail(id, `exited during handshake (code ${code}): ${lastLine || "(no output)"}`);
      return;
    }
    if (attempt === 2) fail(id, `no initialize response within ${TIMEOUT_MS}ms after retry`);
    else console.log(`RETRY ${id}: no answer within ${TIMEOUT_MS}ms`);
  }
}

for (const s of cfg.servers as Array<{ id: string; bin: string; args: string[] }>) {
  await handshake(s.id, s.bin, s.args);
}
const ids = (cfg.servers as Array<{ id: string }>).map((s) => s.id);
console.log(failed ? `\n${failed} failure(s) in ${ids.length} servers` : `\n${ids.length}/${ids.length} servers OK`);
process.exit(failed ? 1 : 0);
