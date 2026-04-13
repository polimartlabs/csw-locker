#!/bin/bash
# Sync Clarity contracts from the cs-locker-contract repo into public/clarity/.
#
# Default source: sibling checkout at ../cs-locker-contract
# Override: CONTRACTS_SRC=/path/to/repo ./scripts/sync-contracts.sh
set -euo pipefail

SRC="${CONTRACTS_SRC:-../cs-locker-contract}"
DEST_ROOT="public/clarity"

if [ ! -d "$SRC" ]; then
  echo "Error: contracts source not found at $SRC" >&2
  echo "Clone https://github.com/polimartlabs/cs-locker-contract next to this repo, or set CONTRACTS_SRC." >&2
  exit 1
fi

for net in mainnet testnet; do
  mkdir -p "$DEST_ROOT/$net"
  rm -f "$DEST_ROOT/$net"/*.clar
  if compgen -G "$SRC/contracts/$net/*.clar" > /dev/null; then
    cp "$SRC"/contracts/"$net"/*.clar "$DEST_ROOT/$net/"
    echo "Synced $net contracts from $SRC/contracts/$net/"
  else
    echo "Warning: no $net contracts found at $SRC/contracts/$net/" >&2
  fi
done
