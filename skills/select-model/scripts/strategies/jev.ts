import {
  type SelectionInput,
  type SelectionResult,
  type SelectorStrategy,
  type ThinkingLevel,
} from "./types.js";
import { clampThinkingLevel } from "./heuristic.js";

type ChoiceCriteria = Record<string, string>;

async function loadTypeSafeSdk(): Promise<{
  TypeSafeClient: any;
  choice: (instructions: string, criteria: ChoiceCriteria) => any;
}> {
  try {
    return (await import("@typesafe-ai/sdk")) as any;
  } catch {
    try {
      const { execSync } = await import("node:child_process");
      const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
      const globalEntry = `${globalRoot}/@typesafe-ai/sdk/dist/index.mjs`;
      return (await import(globalEntry)) as any;
    } catch {
      console.error(
        "[select-model] Error: @typesafe-ai/sdk could not be resolved from local or global npm modules.\n" +
          "Ensure it is installed globally ('npm i -g @typesafe-ai/sdk') or set in NODE_PATH."
      );
      process.exit(1);
    }
  }
}

const LEVEL_DESCRIPTIONS: Record<ThinkingLevel, string> = {
  off: "No extended thinking; instant response for simple lookups, formatting, or minor typos.",
  minimal: "Bare minimum reasoning; localized single-line edits.",
  low: "Short reasoning; routine bug fixes or straightforward logic.",
  medium: "Balanced reasoning; standard feature development and multi-function edits.",
  high: "Deep reasoning; multi-file structural refactoring, concurrency, and async data contracts.",
  xhigh: "Very deep reasoning; complex distributed algorithms, protocol redesign, and system architecture.",
  max: "Maximum reasoning depth; mission-critical verification, compiler passes, and complex mathematical proofs.",
};

export class JevStrategy implements SelectorStrategy {
  readonly name = "jev" as const;

  async select(input: SelectionInput): Promise<SelectionResult> {
    const apiKey = process.env.TYPESAFE_API_KEY?.trim();
    if (!apiKey) {
      console.error(
        "[select-model] Error: TYPESAFE_API_KEY is not set in the environment.\n" +
          "Please export TYPESAFE_API_KEY or run with --strategy heuristic."
      );
      process.exit(1);
    }

    const { TypeSafeClient, choice } = await loadTypeSafeSdk();

    const bunFetch = async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const response = await fetch(input, init);
      const originalClone = response.clone.bind(response);
      response.clone = () => {
        const c = originalClone();
        Object.defineProperty(c, "body", { value: null, configurable: true });
        return c;
      };
      return response;
    };

    const client = new TypeSafeClient({ apiKey, fetch: bunFetch });

    const modelCriteria: ChoiceCriteria = {};
    for (const [id, entry] of Object.entries(input.catalog.models)) {
      const desc = entry.description ? `${entry.description} ` : "";
      const caps =
        entry.capabilities && entry.capabilities.length > 0
          ? `Capabilities: ${entry.capabilities.join(", ")}. `
          : "";
      modelCriteria[id] = `${desc}${caps}Provider: ${entry.provider}. Supported thinking levels: ${entry.levels.join(", ")}.`;
    }

    const levelCriteria: ChoiceCriteria = {};
    for (const [lvl, desc] of Object.entries(LEVEL_DESCRIPTIONS)) {
      levelCriteria[lvl] = desc;
    }

    const stateSummary = {
      task_prompt: input.prompt,
      reference_files_count: input.context.totalFiles,
      reference_total_lines: input.context.totalLines,
      reference_total_bytes: input.context.totalBytes,
      reference_files: input.context.files.map((f) => ({
        path: f.path,
        lines: f.lineCount,
        excerpt: f.content.slice(0, 300),
      })),
    };

    try {
      const response = await client.systemOne({
        state: JSON.stringify(stateSummary),
        questions: {
          model: choice(
            "Which model from the catalog is most appropriate and cost-effective for this task?",
            modelCriteria
          ),
          thinking_level: choice(
            "What level of reasoning/thinking is most appropriate for this task?",
            levelCriteria
          ),
        },
      });

      const chosenModelName = response.answers.model.choice;
      const chosenLevelName = response.answers.thinking_level.choice as ThinkingLevel;
      const confidence = response.answers.model.confidence ?? 0.9;

      const catalogEntry = input.catalog.models[chosenModelName];
      if (!catalogEntry) {
        throw new Error(`Jev returned model "${chosenModelName}" which is not in the model catalog.`);
      }

      const clampedLevel = clampThinkingLevel(chosenLevelName, catalogEntry.levels);

      return {
        model: chosenModelName,
        provider: catalogEntry.provider,
        thinking_level: clampedLevel,
        strategy_used: "jev",
        confidence,
        reasoning: `TypeSafe Jev SDK selected model "${chosenModelName}" (confidence: ${confidence.toFixed(
          2
        )}). Target level "${chosenLevelName}" clamped to "${clampedLevel}" supported by model.`,
      };
    } catch (err) {
      console.error(`[select-model] Jev SDK request failed: ${String(err)}`);
      throw err;
    }
  }
}
