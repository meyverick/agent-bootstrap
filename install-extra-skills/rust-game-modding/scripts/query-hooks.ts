#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join, dirname } from "node:path";

interface HookParam {
  name: string;
  typeName?: string;
  typeFriendly?: string;
}

interface HookEntry {
  Name?: string;
  name?: string;
  Parameters?: HookParam[];
  parameters?: HookParam[];
  ParametersText?: string;
  ReturnTypeName?: string;
  returnTypeName?: string;
  ReturnBehavior?: string;
  Descriptions?: string[];
  descriptions?: string[];
  Category?: string;
  category?: string;
}

const FALLBACK_HOOKS: Record<string, any> = {
  OnEntityTakeDamage: {
    name: "OnEntityTakeDamage",
    signature: "object OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)",
    returnType: "object",
    returnBehavior: "Returning non-null cancels default damage processing",
    description: "Called before damage is dealt to any combat entity (player, animal, structure).",
    category: "Structure / Combat",
  },
  OnPlayerConnected: {
    name: "OnPlayerConnected",
    signature: "void OnPlayerConnected(BasePlayer player)",
    returnType: "void",
    returnBehavior: "Informational",
    description: "Called after a player finishes loading and connects to the server.",
    category: "Player",
  },
  OnServerInitialized: {
    name: "OnServerInitialized",
    signature: "void OnServerInitialized(bool initial)",
    returnType: "void",
    returnBehavior: "Informational",
    description: "Called when server startup completes and navmesh / world generation is loaded.",
    category: "Server",
  },
  OnPlayerTick: {
    name: "OnPlayerTick",
    signature: "object OnPlayerTick(BasePlayer player, PlayerTick tick)",
    returnType: "object",
    returnBehavior: "Returning non-null cancels default tick handling",
    description: "Called every network tick for each active player. Hot hook: strictly zero allocations.",
    category: "Player",
  },
  OnServerSave: {
    name: "OnServerSave",
    signature: "void OnServerSave()",
    returnType: "void",
    returnBehavior: "Informational",
    description: "Called when the server executes its periodic world save.",
    category: "Server",
  },
};

function findMetadataDir(): string | null {
  if (process.env.RUST_METADATA_DIR && existsSync(process.env.RUST_METADATA_DIR)) {
    return process.env.RUST_METADATA_DIR;
  }
  const candidates = [
    resolve(process.cwd(), "one-shot/references/metadata"),
    resolve(process.cwd(), "references/metadata"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../../../one-shot/references/metadata"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function queryHooks(query: string, exact: boolean = false) {
  const metaDir = findMetadataDir();
  const results: any[] = [];
  const lowerQuery = query.toLowerCase();

  if (metaDir) {
    const files = ["carbon-hooks.json", "rust-hooks.json"];
    for (const file of files) {
      const fullPath = join(metaDir, file);
      if (!existsSync(fullPath)) continue;
      try {
        const data = JSON.parse(readFileSync(fullPath, "utf-8"));
        for (const [category, hooks] of Object.entries(data)) {
          if (!Array.isArray(hooks)) continue;
          for (const h of hooks as HookEntry[]) {
            const hName = h.Name || h.name || "";
            const matches = exact
              ? hName.toLowerCase() === lowerQuery
              : hName.toLowerCase().includes(lowerQuery);
            if (matches) {
              const params = (h.Parameters || h.parameters || []).map(
                (p) => `${p.typeFriendly || p.typeName || "object"} ${p.name}`
              );
              const paramText = h.ParametersText || params.join(", ");
              const retType = h.ReturnTypeName || h.returnTypeName || "void";
              results.push({
                name: hName,
                signature: `${retType} ${hName}(${paramText})`,
                returnType: retType,
                returnBehavior: h.ReturnBehavior || "Default",
                description: (h.Descriptions || h.descriptions || [])[0] || "",
                category: h.Category || h.category || category,
                source: file,
              });
            }
          }
        }
      } catch {}
    }
  }

  // Deduplicate by name + source
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const r of results) {
    const key = `${r.name}:${r.source}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }

  if (deduped.length === 0) {
    for (const [name, hook] of Object.entries(FALLBACK_HOOKS)) {
      if (exact ? name.toLowerCase() === lowerQuery : name.toLowerCase().includes(lowerQuery)) {
        deduped.push({ ...hook, source: "fallback-cache" });
      }
    }
  }

  return {
    query,
    total_matches: deduped.length,
    hooks: deduped.slice(0, 20),
  };
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: bun run query-hooks.ts <hook-name> [--exact]");
  process.exit(args.length === 0 ? 1 : 0);
}

const exact = args.includes("--exact");
const query = args.filter((a) => a !== "--exact").join(" ");
const output = queryHooks(query, exact);
console.log(JSON.stringify(output, null, 2));
