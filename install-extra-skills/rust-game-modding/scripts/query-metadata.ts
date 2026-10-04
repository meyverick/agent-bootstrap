#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join, dirname } from "node:path";

interface ItemDef {
  Id: number;
  DisplayName: string;
  ShortName: string;
  Description?: string;
  Stack?: number;
}

interface PrefabDef {
  ID: number;
  Name: string;
  Path: string;
  Components?: string[];
}

interface ConvarDef {
  Name: string;
  Type?: string;
  Help?: string;
  DefaultValue?: any;
}

const FALLBACK_ITEMS: ItemDef[] = [
  {
    Id: 1588298435,
    DisplayName: "Assault Rifle",
    ShortName: "rifle.ak",
    Description: "The AK-47 assault rifle is a versatile high-tier weapon.",
    Stack: 1,
  },
  {
    Id: -778367295,
    DisplayName: "5.56 Rifle Ammo",
    ShortName: "ammo.rifle",
    Description: "Standard 5.56mm ammunition for rifles.",
    Stack: 128,
  },
  {
    Id: 3655341,
    DisplayName: "Wood",
    ShortName: "wood",
    Description: "Raw building material harvested from trees.",
    Stack: 1000,
  },
  {
    Id: 69511070,
    DisplayName: "Metal Fragments",
    ShortName: "metal.fragments",
    Description: "Smelted metal used for building and crafting.",
    Stack: 1000,
  },
  {
    Id: -932201673,
    DisplayName: "Scrap",
    ShortName: "scrap",
    Description: "Primary currency and research component.",
    Stack: 1000,
  },
];

const FALLBACK_PREFABS: PrefabDef[] = [
  {
    ID: 1546738290,
    Name: "autoturret_deployed",
    Path: "assets/prefabs/npc/autoturret/autoturret_deployed.prefab",
    Components: ["AutoTurret"],
  },
  {
    ID: 982347101,
    Name: "cupboard.tool.deployed",
    Path: "assets/prefabs/deployable/tool cupboard/cupboard.tool.deployed.prefab",
    Components: ["BuildingPrivlidge"],
  },
];

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

function searchMetadata(query: string) {
  const metaDir = findMetadataDir();
  const lowerQuery = query.toLowerCase();

  const results = {
    items: [] as any[],
    prefabs: [] as any[],
    convars: [] as any[],
  };

  if (metaDir) {
    // 1. Items
    const itemsFile = join(metaDir, "rust-items.json");
    if (existsSync(itemsFile)) {
      try {
        const items = JSON.parse(readFileSync(itemsFile, "utf-8")) as ItemDef[];
        for (const item of items) {
          if (
            item.ShortName?.toLowerCase().includes(lowerQuery) ||
            item.DisplayName?.toLowerCase().includes(lowerQuery)
          ) {
            results.items.push({
              id: item.Id,
              displayName: item.DisplayName,
              shortName: item.ShortName,
              stack: item.Stack,
              description: item.Description,
            });
            if (results.items.length >= 10) break;
          }
        }
      } catch {}
    }

    // 2. Prefabs
    const prefabsFile = join(metaDir, "rust-prefabs.json");
    if (existsSync(prefabsFile)) {
      try {
        const prefabs = JSON.parse(readFileSync(prefabsFile, "utf-8")) as PrefabDef[];
        for (const prefab of prefabs) {
          if (
            prefab.Name?.toLowerCase().includes(lowerQuery) ||
            prefab.Path?.toLowerCase().includes(lowerQuery)
          ) {
            results.prefabs.push({
              id: prefab.ID,
              name: prefab.Name,
              path: prefab.Path,
              components: prefab.Components,
            });
            if (results.prefabs.length >= 10) break;
          }
        }
      } catch {}
    }

    // 3. Convars
    const convarsFile = join(metaDir, "rust-convars.json");
    if (existsSync(convarsFile)) {
      try {
        const convars = JSON.parse(readFileSync(convarsFile, "utf-8")) as ConvarDef[];
        for (const cv of convars) {
          if (cv.Name?.toLowerCase().includes(lowerQuery)) {
            results.convars.push({
              name: cv.Name,
              type: cv.Type,
              defaultValue: cv.DefaultValue,
              help: cv.Help,
            });
            if (results.convars.length >= 10) break;
          }
        }
      } catch {}
    }
  }

  // Fallbacks if nothing matched
  if (results.items.length === 0 && results.prefabs.length === 0 && results.convars.length === 0) {
    for (const item of FALLBACK_ITEMS) {
      if (
        item.ShortName.toLowerCase().includes(lowerQuery) ||
        item.DisplayName.toLowerCase().includes(lowerQuery)
      ) {
        results.items.push(item);
      }
    }
    for (const prefab of FALLBACK_PREFABS) {
      if (
        prefab.Name.toLowerCase().includes(lowerQuery) ||
        prefab.Path.toLowerCase().includes(lowerQuery)
      ) {
        results.prefabs.push(prefab);
      }
    }
  }

  const totalMatches =
    results.items.length + results.prefabs.length + results.convars.length;

  return {
    query,
    total_matches: totalMatches,
    results,
  };
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: bun run query-metadata.ts <search-query>");
  process.exit(args.length === 0 ? 1 : 0);
}

const query = args.join(" ");
const output = searchMetadata(query);
console.log(JSON.stringify(output, null, 2));
