import { getBtcVault, type BtcVaultRecord } from "@/lib/btcVaultStorage";

export function getVaultFromRouteId(routeWalletId?: string | null): BtcVaultRecord | null {
  if (!routeWalletId) return null;
  return getBtcVault(routeWalletId) ?? null;
}

export function isVaultRouteId(routeWalletId?: string | null): boolean {
  return getVaultFromRouteId(routeWalletId) != null;
}
