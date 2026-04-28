import { buildScopedStorageKey } from "@/lib/userScope";

/**
 * User-controlled network preference.
 *
 * The app has historically *inferred* the network from the active Stacks wallet id prefix
 * (SP/SM → mainnet, ST/SN → testnet), which worked but gave the user no way to override.
 * This module persists a manual preference so the header toggle is authoritative.
 *
 * The preference is read at layout boot and updated when the user clicks the header
 * switcher. A custom `csw-network-changed` event lets any component (e.g. dashboards,
 * Locks page poller) react without re-prop-drilling.
 */

const STORAGE_KEY = "csw_network_preference_v1";
export const NETWORK_CHANGED_EVENT = "csw-network-changed";

export type NetworkPreference = "mainnet" | "testnet";

export function loadNetworkPreference(): NetworkPreference | null {
  if (typeof localStorage === "undefined") return null;
  const scopedKey = buildScopedStorageKey(STORAGE_KEY);
  const v = localStorage.getItem(scopedKey) ?? (scopedKey === STORAGE_KEY ? null : localStorage.getItem(STORAGE_KEY));
  if (v != null && scopedKey !== STORAGE_KEY && localStorage.getItem(scopedKey) == null) {
    localStorage.setItem(scopedKey, v);
  }
  return v === "mainnet" || v === "testnet" ? v : null;
}

export function saveNetworkPreference(net: NetworkPreference): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(buildScopedStorageKey(STORAGE_KEY), net);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NETWORK_CHANGED_EVENT, { detail: net }));
  }
}

export function clearNetworkPreference(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(buildScopedStorageKey(STORAGE_KEY));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NETWORK_CHANGED_EVENT, { detail: null }));
  }
}
