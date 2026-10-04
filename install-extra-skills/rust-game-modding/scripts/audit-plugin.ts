#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from "node:fs";

interface CheckViolation {
  id: string;
  rule: string;
  severity: "ERROR" | "WARN";
  line: number;
  snippet: string;
  fixable: boolean;
}

const HOT_HOOK_NAMES = [
  "OnTick",
  "OnPlayerTick",
  "OnEntityTakeDamage",
  "CanNetworkTo",
  "OnItemAddedToContainer",
  "OnRunPlayerMetabolism",
  "OnMeleeAttack",
];

function analyzePlugin(source: string, filename: string) {
  const lines = source.split("\n");
  const violations: CheckViolation[] = [];

  let currentMethodName: string | null = null;
  let inHotHook = false;
  let methodBraceDepth = 0;
  let hasUnloadMethod = false;
  let hasTimerAllocated = false;
  let timerDestroyedInUnload = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Check for method declarations
    const methodMatch = line.match(/(?:void|object|bool|int|string|Task|ValueTask)\s+([A-Za-z0-9_]+)\s*\(/);
    if (methodMatch && !line.includes("new ") && !line.includes("=>")) {
      currentMethodName = methodMatch[1];
      inHotHook = HOT_HOOK_NAMES.includes(currentMethodName);
      if (currentMethodName === "Unload") {
        hasUnloadMethod = true;
      }
    }

    if (line.includes("timer.Every") || line.includes("timer.Once") || line.includes("Timer ")) {
      hasTimerAllocated = true;
    }

    if (currentMethodName === "Unload" && (line.includes(".Destroy()") || line.includes("DestroyUi"))) {
      timerDestroyedInUnload = true;
    }

    // Hot hook violations
    if (inHotHook) {
      // 1. LINQ
      if (/\.(?:Where|Select|OrderBy|ToList|ToArray|First|FirstOrDefault)\s*\(/.test(line)) {
        violations.push({
          id: "HOT_HOOK_LINQ",
          rule: "Zero LINQ in hot hooks (managed heap churn causes GC pauses)",
          severity: "ERROR",
          line: lineNum,
          snippet: trimmed,
          fixable: false,
        });
      }

      // 2. String interpolation / boxing
      if (/\$"[^"]*"/.test(line) || /string\.Format\s*\(/.test(line)) {
        violations.push({
          id: "HOT_HOOK_BOXING",
          rule: "Zero string formatting/interpolation in hot hooks",
          severity: "ERROR",
          line: lineNum,
          snippet: trimmed,
          fixable: false,
        });
      }

      // 3. Unpooled collections
      if (/new\s+(?:List|HashSet|Dictionary)\s*<[^>]+>\s*\(/.test(line)) {
        violations.push({
          id: "HOT_HOOK_UNPOOLED_COLLECTION",
          rule: "Managed collections in hot hooks must use Facepunch.Pool",
          severity: "ERROR",
          line: lineNum,
          snippet: trimmed,
          fixable: true,
        });
      }
    }

    // 4. NativeArray leak
    if (/new\s+NativeArray\s*<[^>]+>\s*\(/.test(line) && !source.includes(".Dispose()")) {
      violations.push({
        id: "UNMANAGED_NATIVE_ARRAY_LEAK",
        rule: "NativeArray allocations must be disposed inside finally blocks with .IsCreated check",
        severity: "ERROR",
        line: lineNum,
        snippet: trimmed,
        fixable: false,
      });
    }

    // 5. Unprotected Command
    if (/\[(?:Command|ChatCommand|ConsoleCommand)\s*\([^)]+\)\]/.test(line)) {
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      if (!prevLine.includes("[ProtectedCommand]") && !line.includes("[ProtectedCommand]")) {
        violations.push({
          id: "UNPROTECTED_COMMAND",
          rule: "UI and client-accessible commands should enforce [ProtectedCommand]",
          severity: "WARN",
          line: lineNum,
          snippet: trimmed,
          fixable: true,
        });
      }
    }
  }

  // 6. Unload teardown check
  if (hasTimerAllocated && !timerDestroyedInUnload) {
    violations.push({
      id: "UNLOAD_TEARDOWN_MISSING",
      rule: "Plugins allocating timers must destroy them inside Unload() to avoid hot-reload leaks",
      severity: "ERROR",
      line: hasUnloadMethod ? 1 : lines.length,
      snippet: "Missing timer?.Destroy() in Unload()",
      fixable: true,
    });
  }

  return violations;
}

function applyFixes(source: string, violations: CheckViolation[]): { fixedSource: string; fixesApplied: string[] } {
  let lines = source.split("\n");
  const fixesApplied: string[] = [];

  // Fix 1: Unprotected commands
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\[(?:Command|ChatCommand|ConsoleCommand)\s*\([^)]+\)\]/.test(line)) {
      const prevLine = i > 0 ? lines[i - 1].trim() : "";
      if (!prevLine.includes("[ProtectedCommand]") && !line.includes("[ProtectedCommand]")) {
        const indent = line.match(/^\s*/)?.[0] || "";
        lines.splice(i, 0, `${indent}[ProtectedCommand]`);
        fixesApplied.push(`Line ${i + 1}: Added [ProtectedCommand] attribute`);
        i++;
      }
    }
  }

  // Fix 2: Pool replacement
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(var|\b[A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*=\s*new\s+(List<[^>]+>)\s*\(\s*\);/);
    if (match) {
      const indent = line.match(/^\s*/)?.[0] || "";
      const varName = match[2];
      const colType = match[3];
      lines[i] = `${indent}var ${varName} = Facepunch.Pool.Get<${colType}>();\n${indent}try\n${indent}{\n${indent}    // Auto-pool wrapped\n${indent}}\n${indent}finally\n${indent}{\n${indent}    Facepunch.Pool.Free(ref ${varName});\n${indent}}`;
      fixesApplied.push(`Line ${i + 1}: Replaced 'new ${colType}' with Facepunch.Pool.Get/Free`);
    }
  }

  // Fix 3: Unload teardown
  const hasUnload = lines.some((l) => l.includes("void Unload()"));
  if (hasUnload) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("void Unload()")) {
        // find opening brace
        let braceIndex = i;
        while (braceIndex < lines.length && !lines[braceIndex].includes("{")) {
          braceIndex++;
        }
        if (braceIndex < lines.length) {
          const indent = "            ";
          lines.splice(braceIndex + 1, 0, `${indent}_timer?.Destroy();\n${indent}_timer = null;`);
          fixesApplied.push(`Added timer cleanup to Unload()`);
          break;
        }
      }
    }
  }

  return { fixedSource: lines.join("\n"), fixesApplied };
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: bun run audit-plugin.ts <path-to-plugin.cs> [--fix]");
  process.exit(args.length === 0 ? 1 : 0);
}

const doFix = args.includes("--fix");
const targetFile = args.find((a) => !a.startsWith("--"));

if (!targetFile || !existsSync(targetFile)) {
  console.error(JSON.stringify({ error: `File not found: ${targetFile}` }));
  process.exit(1);
}

const source = readFileSync(targetFile, "utf-8");
const violations = analyzePlugin(source, targetFile);

let fixes: string[] = [];
if (doFix && violations.length > 0) {
  const { fixedSource, fixesApplied } = applyFixes(source, violations);
  writeFileSync(targetFile, fixedSource, "utf-8");
  fixes = fixesApplied;
}

const pass = violations.filter((v) => v.severity === "ERROR").length === 0;

const result = {
  target: targetFile,
  pass,
  total_violations: violations.length,
  fixed_applied: fixes.length,
  fixes,
  violations,
  summary: pass
    ? `Plugin passed all critical audit gates (${violations.length} warnings/suggestions).`
    : `Plugin failed audit with ${violations.filter((v) => v.severity === "ERROR").length} errors.`,
};

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
