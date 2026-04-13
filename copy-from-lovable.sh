#!/bin/bash
# Sync tracked files from a local Lovable.dev checkout into this repo.
# Overwrites src/, public/, index.html, and Vite/Tailwind configs.
set -e

SRC="${LOVABLE_SRC:-../../friedger/stacks-smart-ui-kit}"

if [ ! -d "$SRC" ]; then
  echo "Error: Lovable source not found at $SRC" >&2
  echo "Override with LOVABLE_SRC=/path/to/repo" >&2
  exit 1
fi

DEST="$(pwd)"

cd "$SRC"
FILES=$(git ls-files)

for file in $FILES; do
  mkdir -p "$DEST/$(dirname "$file")"
  cp "$file" "$DEST/$file"
done

echo "Copied $(echo "$FILES" | wc -l) tracked files from $SRC"
