/**
 * Normalized model for the connected session (Hiro/Stacks + Bitcoin via the same provider, e.g. Leather).
 * Use preferredStx for Clarity / smart wallet admin; preferredBtc for L1 UTXO / PSBT flows.
 */

export type NetworkAddress = {
  address: string;
  publicKey?: string;
};

export function isTaprootBtcAddress(address: string): boolean {
  const a = address.trim();
  return a.startsWith("bc1p") || a.startsWith("tb1p");
}

export type WalletSessionData = {
  addresses: {
    stx: NetworkAddress[];
    btc: NetworkAddress[];
  };
  /** First valid STX address — use for contract owner / smart wallet discovery. */
  preferredStx: NetworkAddress | null;
  /** First valid native BTC address — use for @stacks/connect sendTransfer / PSBT flows (L1). */
  preferredBtc: NetworkAddress | null;
  /** Taproot (P2TR) payment or ordinals address when the wallet exposes it. */
  taprootBtc: NetworkAddress | null;
  profile?: unknown;
  publicKey?: string;
};

function isValidNetworkAddress(value: unknown): value is NetworkAddress {
  if (typeof value !== "object" || value === null) return false;
  const a = (value as { address?: unknown }).address;
  return typeof a === "string" && a.length > 0;
}

export function filterStxBtcFromStorage(
  stx: unknown,
  btc: unknown
): { stx: NetworkAddress[]; btc: NetworkAddress[] } {
  const stxList = Array.isArray(stx) ? stx.filter(isValidNetworkAddress) : [];
  const btcList = Array.isArray(btc) ? btc.filter(isValidNetworkAddress) : [];
  return { stx: stxList, btc: btcList };
}

type ConnectAddressEntry = {
  symbol: string;
  address: string;
  publicKey?: string;
};

/**
 * @stacks/connect `connect()` result uses a flat `addresses` array with `symbol` per entry.
 */
export function walletSessionFromConnectResponse(
  response: { addresses?: ConnectAddressEntry[]; profile?: unknown; publicKey?: string } | null | undefined
): WalletSessionData | null {
  if (!response?.addresses?.length) return null;
  const list = response.addresses;
  const stxEntry = list.find((a) => a.symbol.toLowerCase() === "stx");
  const btcRows = list.filter((a) => a.symbol.toLowerCase() === "btc" && a.address);
  const stx: NetworkAddress[] = [];
  const btc: NetworkAddress[] = [];
  if (stxEntry?.address) {
    stx.push({ address: stxEntry.address, publicKey: stxEntry.publicKey });
  }
  for (const row of btcRows) {
    btc.push({ address: row.address, publicKey: row.publicKey });
  }
  const taprootFromAny = list.find((a) => a.address && isTaprootBtcAddress(a.address));
  const taprootBtc: NetworkAddress | null = taprootFromAny
    ? { address: taprootFromAny.address, publicKey: taprootFromAny.publicKey }
    : btc.find((b) => isTaprootBtcAddress(b.address)) ?? null;
  return buildWalletSessionData({
    stx,
    btc,
    taprootBtc,
    profile: response.profile,
    publicKey: response.publicKey,
  });
}

function buildWalletSessionData(input: {
  stx: NetworkAddress[];
  btc: NetworkAddress[];
  taprootBtc?: NetworkAddress | null;
  profile?: unknown;
  publicKey?: string;
}): WalletSessionData {
  const taproot =
    input.taprootBtc ??
    input.btc.find((b) => isTaprootBtcAddress(b.address)) ??
    null;
  return {
    addresses: { stx: input.stx, btc: input.btc },
    preferredStx: input.stx[0] ?? null,
    preferredBtc: input.btc.find((b) => !isTaprootBtcAddress(b.address)) ?? input.btc[0] ?? null,
    taprootBtc: taproot,
    profile: input.profile,
    publicKey: input.publicKey,
  };
}

export function walletSessionFromLocalStorage(
  userData: { addresses?: { stx?: unknown; btc?: unknown }; profile?: unknown; publicKey?: string } | null
): WalletSessionData | null {
  if (!userData?.addresses) return null;
  const { stx, btc } = filterStxBtcFromStorage(
    userData.addresses.stx,
    userData.addresses.btc
  );
  if (stx.length === 0 && btc.length === 0) return null;
  return buildWalletSessionData({
    stx,
    btc,
    taprootBtc: btc.find((b) => isTaprootBtcAddress(b.address)) ?? null,
    profile: userData.profile,
    publicKey: userData.publicKey,
  });
}
