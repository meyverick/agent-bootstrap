#!/usr/bin/env bash
# Workspace Orchestrator Push Gate
# Usage: scripts/check.sh [--quick]
set -euo pipefail

cd "$(dirname "$0")/.."
QUICK="${1:-}"

echo "== 1/3 submodule pointers =="
status="$(git submodule status || true)"
if [ -z "$status" ]; then
    echo "  (no submodules registered)"
else
    echo "$status" | sed 's/^/  /'
    if echo "$status" | grep -qE '^[+-]'; then
        echo "FAIL: submodule pointer is stale (+) or uninitialized (-)"
        echo "      commit updated pointer in orchestrator: git add <path> && git commit"
        exit 1
    fi
fi

echo "== 2/3 tracked credential scan =="
leaks="$(git ls-files | grep -iE '(^|/)(\.env|\.env\..*|.*\.pem|.*\.key|.*\.p12|id_rsa.*|.*credentials?.*)$' || true)"
if [ -n "$leaks" ]; then
    echo "$leaks" | sed 's/^/  X tracked: /'
    echo "FAIL: credential-shaped file is tracked by git"
    exit 1
fi
echo "  no credential-shaped paths tracked"

echo "== 3/3 submodule gates =="
submodule_count=0
while read -r _sha path _rest; do
    [ -n "$path" ] || continue
    submodule_count=$((submodule_count + 1))
    if [ -x "$path/scripts/check.sh" ]; then
        echo "-- $path --"
        (cd "$path" && ./scripts/check.sh $QUICK)
    else
        echo "FAIL: $path has no executable scripts/check.sh"
        echo "      orchestrator requires every registered submodule to provide scripts/check.sh"
        exit 1
    fi
done < <(git submodule status | awk '{print $1, $2}')

if [ "$submodule_count" -eq 0 ]; then
    echo "  (no submodules registered)"
fi

echo "workspace gate: OK"
