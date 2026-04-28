/**
 * Resolve the 33-byte compressed secp256k1 public key for the connected Bitcoin address.
 *
 * We intentionally use the in-memory wallet session only to avoid triggering extra
 * wallet RPC popups during BTC flows (lock/vault creation). Signature requests still
 * open the wallet when needed, but metadata lookup should stay silent.
 */

import type { WalletSessionData } from "@/lib/walletSession";
import { request as stacksRequest } from "@stacks/connect";
import { getClientConfig } from "@/utils/chain-config";

export type OwnerPubkeyResult = {
  address: string;
  publicKeyHex: string;
};

function pick(session: WalletSessionData, address: string): string | undefined {
  const all = [
    session.preferredBtc,
    session.taprootBtc,
    ...session.addresses.btc,
  ].filter(Boolean);
  return all.find((a) => a && a.address === address && a.publicKey)?.publicKey;
}

export async function resolveOwnerPubkey(
  session: WalletSessionData | null,
  address: string,
  options: { allowWalletRpc?: boolean } = {}
): Promise<OwnerPubkeyResult> {
  if (!address) throw new Error("No Bitcoin address selected.");
  const fromSession = session ? pick(session, address) : undefined;
  if (fromSession) {
    return { address, publicKeyHex: fromSession };
  }
  if (options.allowWalletRpc) {
    const network = getClientConfig(address).network;
    const res = await stacksRequest("getAddresses", { network });
    const entries = res?.addresses ?? [];
    const match = entries.find((e) => e.address === address && e.publicKey);
    if (match?.publicKey) {
      return { address, publicKeyHex: match.publicKey };
    }
  }
  throw new Error(
    "Bitcoin public key is missing from the current wallet session. Reconnect once, then retry."
  );
}
