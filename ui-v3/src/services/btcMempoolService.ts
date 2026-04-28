import { getClientConfig } from "@/utils/chain-config";

type MempoolAddressJson = {
  chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number };
};

export function mempoolBaseUrlForAddress(address: string): string {
  const { network } = getClientConfig(address);
  return network === "mainnet" ? "https://mempool.space/api" : "https://mempool.space/testnet/api";
}

export async function getAddressBalanceSats(address: string): Promise<number | null> {
  const base = mempoolBaseUrlForAddress(address);
  try {
    const res = await fetch(`${base}/address/${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as MempoolAddressJson;
    const chain = (j.chain_stats.funded_txo_sum ?? 0) - (j.chain_stats.spent_txo_sum ?? 0);
    const m = (j.mempool_stats?.funded_txo_sum ?? 0) - (j.mempool_stats?.spent_txo_sum ?? 0);
    return Math.max(0, chain + m);
  } catch {
    return null;
  }
}

export type MempoolTxStatus = {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
};
export type MempoolBtcTx = {
  txid: string;
  value: number;
  status?: MempoolTxStatus;
  vout?: Array<{ scriptpubkey_address?: string; value?: number }>;
};

export async function getAddressTxs(address: string, afterTxid?: string): Promise<MempoolBtcTx[]> {
  const base = mempoolBaseUrlForAddress(address);
  try {
    const url = afterTxid
      ? `${base}/address/${encodeURIComponent(address)}/txs/chain/${afterTxid}`
      : `${base}/address/${encodeURIComponent(address)}/txs`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((row): MempoolBtcTx | null => {
        if (typeof row === "string") return { txid: row, value: 0 };
        const o = row as {
          txid?: string;
          value?: number;
          status?: MempoolTxStatus;
          vout?: MempoolBtcTx["vout"];
        };
        if (!o.txid) return null;
        return {
          txid: o.txid,
          value: o.value ?? 0,
          status: o.status,
          vout: o.vout,
        };
      })
      .filter((t): t is MempoolBtcTx => t !== null);
  } catch {
    return [];
  }
}

/** Directly query confirmation state for a single txid. Much cheaper than listing address history. */
export async function getTxStatus(txid: string, networkHint: string): Promise<MempoolTxStatus | null> {
  const base =
    networkHint === "mainnet" ? "https://mempool.space/api" : "https://mempool.space/testnet/api";
  try {
    const res = await fetch(`${base}/tx/${txid}/status`);
    if (!res.ok) return null;
    const j = (await res.json()) as MempoolTxStatus;
    return j;
  } catch {
    return null;
  }
}

/** Fetch the vout list for a txid — needed to locate which output index funded a P2WSH lock. */
export async function getTxVout(
  txid: string,
  networkHint: string
): Promise<Array<{ scriptpubkey_address?: string; value?: number }>> {
  const base =
    networkHint === "mainnet" ? "https://mempool.space/api" : "https://mempool.space/testnet/api";
  try {
    const res = await fetch(`${base}/tx/${txid}`);
    if (!res.ok) return [];
    const j = (await res.json()) as { vout?: Array<{ scriptpubkey_address?: string; value?: number }> };
    return j.vout ?? [];
  } catch {
    return [];
  }
}

/**
 * Full tx shape from mempool.space's `/tx/{txid}` endpoint, with the fields we need
 * for chain-side lock recovery: per-vout `scriptpubkey_type`, and per-vin `witness`
 * + `prevout` so we can match a CLTV-shaped spend back to its funding output.
 */
export type MempoolBtcVin = {
  txid: string;
  vout: number;
  prevout?: {
    scriptpubkey?: string;
    scriptpubkey_address?: string;
    scriptpubkey_type?: string;
    value?: number;
  };
  witness?: string[];
  is_coinbase?: boolean;
};

export type MempoolBtcVout = {
  scriptpubkey?: string;
  scriptpubkey_address?: string;
  scriptpubkey_type?: string;
  value?: number;
};

export type MempoolBtcTxFull = {
  txid: string;
  vin: MempoolBtcVin[];
  vout: MempoolBtcVout[];
  status?: MempoolTxStatus;
  size?: number;
  weight?: number;
  fee?: number;
};

export async function getTxFull(
  txid: string,
  networkHint: string
): Promise<MempoolBtcTxFull | null> {
  const base =
    networkHint === "mainnet" ? "https://mempool.space/api" : "https://mempool.space/testnet/api";
  try {
    const res = await fetch(`${base}/tx/${txid}`);
    if (!res.ok) return null;
    const j = (await res.json()) as MempoolBtcTxFull;
    if (!j?.txid) return null;
    return {
      txid: j.txid,
      vin: Array.isArray(j.vin) ? j.vin : [],
      vout: Array.isArray(j.vout) ? j.vout : [],
      status: j.status,
      size: j.size,
      weight: j.weight,
      fee: j.fee,
    };
  } catch {
    return null;
  }
}

/** Simple BTC/USD (spot) for header — CoinGecko public (no key). */
export async function getBtcUsdPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { bitcoin?: { usd: number } };
    return j.bitcoin?.usd ?? null;
  } catch {
    return null;
  }
}

export function getMempoolTxUrl(txid: string, forAddress: string): string {
  const { network } = getClientConfig(forAddress);
  const host = network === "mainnet" ? "https://mempool.space" : "https://mempool.space/testnet";
  return `${host}/tx/${txid}`;
}

export type MempoolUtxo = {
  txid: string;
  vout: number;
  value: number;
  status?: { confirmed: boolean; block_height?: number; block_time?: number };
};

export type OrdinalInscription = {
  id: string;
  number?: number;
  contentType?: string;
};

/**
 * Taproot ordinal indexing helper.
 * Uses Hiro's public ordinals API when available and degrades gracefully to [].
 */
export async function getTaprootOrdinalInscriptions(address: string): Promise<OrdinalInscription[]> {
  try {
    const res = await fetch(
      `https://api.hiro.so/ordinals/v1/inscriptions?address=${encodeURIComponent(address)}&limit=20&offset=0`
    );
    if (!res.ok) return [];
    const j = (await res.json()) as {
      results?: Array<{ id?: string; number?: number; mime_type?: string; content_type?: string }>;
    };
    const rows = Array.isArray(j.results) ? j.results : [];
    return rows
      .map((row) => {
        if (!row?.id) return null;
        return {
          id: row.id,
          number: row.number,
          contentType: row.content_type ?? row.mime_type,
        } as OrdinalInscription;
      })
      .filter((row): row is OrdinalInscription => row !== null);
  } catch {
    return [];
  }
}

/** Address UTXO set — required to build a spending transaction client-side. */
export async function getAddressUtxos(address: string): Promise<MempoolUtxo[]> {
  const base = mempoolBaseUrlForAddress(address);
  try {
    const res = await fetch(`${base}/address/${encodeURIComponent(address)}/utxo`);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => {
        const o = row as { txid?: string; vout?: number; value?: number; status?: MempoolUtxo["status"] };
        if (typeof o.txid !== "string" || typeof o.vout !== "number" || typeof o.value !== "number") return null;
        return { txid: o.txid, vout: o.vout, value: o.value, status: o.status };
      })
      .filter((u): u is MempoolUtxo => u !== null);
  } catch {
    return [];
  }
}

type MempoolTxDetail = {
  vin: Array<{
    witness?: string[];
    scriptsig?: string;
    scriptsig_asm?: string;
    prevout?: { scriptpubkey_address?: string; scriptpubkey_type?: string };
  }>;
};

function isCompressedPubkeyHex(candidate: unknown): candidate is string {
  return (
    typeof candidate === "string" &&
    candidate.length === 66 &&
    /^(02|03)[0-9a-f]{64}$/i.test(candidate)
  );
}

/**
 * Look up a compressed 33-byte secp256k1 public key for a Bitcoin address by scanning its
 * spending history on mempool.space.
 *
 * Supported script types:
 *   - P2WPKH  (`bc1q…` / `tb1q…`): pubkey is `witness[1]` of a spend whose witness stack is `[sig, pubkey]`.
 *   - P2SH-P2WPKH (`3…` / `2…`):  same `[sig, pubkey]` witness + a scriptSig that wraps the P2WPKH program.
 *   - P2PKH   (`1…` / `m…` / `n…`): scriptSig is `<sig> <pubkey>`; `scriptsig_asm` exposes both as pushes.
 *
 * Returns null when:
 *   - the address has never spent (so no pubkey is on-chain yet), or
 *   - the address is a script type we can't safely extract from (P2WSH, P2TR key-path, non-standard).
 */
export async function fetchPubkeyForAddress(address: string): Promise<string | null> {
  const base = mempoolBaseUrlForAddress(address);
  try {
    const res = await fetch(`${base}/address/${encodeURIComponent(address)}/txs`);
    if (!res.ok) return null;
    const txs: unknown = await res.json();
    if (!Array.isArray(txs)) return null;
    for (const raw of txs) {
      const tx = raw as MempoolTxDetail;
      for (const vin of tx.vin ?? []) {
        if (vin.prevout?.scriptpubkey_address !== address) continue;

        const wit = vin.witness;
        if (Array.isArray(wit) && wit.length === 2 && isCompressedPubkeyHex(wit[1])) {
          return wit[1].toLowerCase();
        }

        const asm = vin.scriptsig_asm;
        if (typeof asm === "string" && asm.length > 0) {
          // scriptsig_asm looks like:   "OP_PUSHBYTES_71 3045…  OP_PUSHBYTES_33 02abcd…"
          // Grab every hex push and pick the first one that looks like a compressed pubkey.
          const pushes = asm
            .split(/\s+/)
            .filter((tok) => /^[0-9a-f]+$/i.test(tok));
          for (const tok of pushes) {
            if (isCompressedPubkeyHex(tok)) {
              return tok.toLowerCase();
            }
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Current chain tip block height — used to set `nLockTime` to "today" when spending CLTV outputs. */
export async function getTipHeight(address: string): Promise<number | null> {
  const base = mempoolBaseUrlForAddress(address);
  try {
    const res = await fetch(`${base}/blocks/tip/height`);
    if (!res.ok) return null;
    const text = await res.text();
    const n = parseInt(text.trim(), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Broadcast a signed raw tx (hex). Returns the txid on success, or throws on failure. */
export async function broadcastRawTx(hex: string, networkHint: "mainnet" | "testnet"): Promise<string> {
  const base =
    networkHint === "mainnet" ? "https://mempool.space/api" : "https://mempool.space/testnet/api";
  const res = await fetch(`${base}/tx`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: hex,
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(body || `Broadcast failed with HTTP ${res.status}`);
  }
  return body.trim();
}
