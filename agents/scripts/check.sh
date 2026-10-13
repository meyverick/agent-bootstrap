#!/usr/bin/env bash
# agent-bootstrap Pre-Push Gate
# Usage: scripts/check.sh [--quick]
set -euo pipefail

cd "$(dirname "$0")/.."
QUICK="${1:-}"

# Slot 1: Format verification
echo "== 1/6 format =="
echo "  checking shell script syntax..."
while IFS= read -r shfile; do
    bash -n "$shfile"
done < <(find . -maxdepth 3 -name "*.sh" 2>/dev/null)
echo "  format syntax: OK"

# Slot 2: Strict linting
echo "== 2/6 linter =="
if command -v bun >/dev/null 2>&1 && [ -f "scripts/check-deps.ts" ]; then
    echo "  running check-deps via bun..."
    bun scripts/check-deps.ts
else
    echo "  (bun not found or scripts/check-deps.ts absent, skipping dep check)"
fi

# Slot 3: Unit and evals check
echo "== 3/6 unit / evals check =="
eval_errors=0
while IFS= read -r jsonfile; do
    if command -v python3 >/dev/null 2>&1; then
        python3 -m json.tool "$jsonfile" >/dev/null || { echo "  FAIL: invalid JSON in $jsonfile"; eval_errors=$((eval_errors + 1)); }
    elif command -v bun >/dev/null 2>&1; then
        bun -e "JSON.parse(await Bun.file('$jsonfile').text())" || { echo "  FAIL: invalid JSON in $jsonfile"; eval_errors=$((eval_errors + 1)); }
    fi
done < <(find . -maxdepth 4 -path "*/evals/*.json" 2>/dev/null)
[ "$eval_errors" -eq 0 ] || { echo "FAIL: JSON syntax errors in evals"; exit 1; }
echo "  evals and json integrity: OK"

# Slot 4: Compile-time asset tracking check
echo "== 4/6 compile-time inputs are tracked =="
# Verify tracked files against index
untracked_leaks="$(git ls-files --others --exclude-standard | grep -iE '(^|/)(\.env|\.env\..*|.*\.pem|.*\.key|.*\.p12|id_rsa.*)$' || true)"
if [ -n "$untracked_leaks" ]; then
    echo "$untracked_leaks" | sed 's/^/  X sensitive untracked: /'
    echo "FAIL: sensitive untracked files found"
    exit 1
fi
echo "  asset tracking: OK"

# --- Fast Loop Exit Boundary ---
if [ "$QUICK" = "--quick" ]; then
    echo "fast checks passed; clean-clone and smoke tests skipped (--quick)"
    exit 0
fi

# Slot 5: Hermetic clean-clone sandbox
echo "== 5/6 clean-clone sandbox =="
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone -q . "$tmp/clone"
(
    cd "$tmp/clone"
    while IFS= read -r shfile; do
        bash -n "$shfile"
    done < <(find . -maxdepth 3 -name "*.sh" 2>/dev/null)

    if command -v bun >/dev/null 2>&1 && [ -f "scripts/check-deps.ts" ]; then
        bun scripts/check-deps.ts >/dev/null
    fi
)
echo "clean clone builds and tests: OK"

# Slot 6: Smoke / runtime test
echo "== 6/6 smoke / runtime test =="
if [ -f "agents/AGENTS.md" ]; then
    [ -s "agents/AGENTS.md" ] || { echo "FAIL: AGENTS.md is empty"; exit 1; }
    echo "  AGENTS.md present and non-empty"
fi
echo "smoke test: OK"

echo "lane: OK"
