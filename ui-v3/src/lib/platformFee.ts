/**
 * Platform (CSW Smart Wallet treasury) fee — single source of truth.
 *
 * Philosophy:
 *   - Opt-in, fail-open: if no treasury address is configured for the active network,
 *     the fee is *silently disabled*. We never route money to a placeholder.
 *   - Deterministic: `computeBtcPlatformFee(amount, network)` returns the exact sats a user
 *     will pay for a given action. Callers add it to their recipient list / PSBT.
 *   - Honest UX: every call surfaces `{ feeSats, treasury, enabled, bps }` so the caller can
 *     render a clear "Platform fee" line to the user.
 *
 * Configuration precedence:
 *   - Treasury addresses and min/cap can come from env.
 *   - BTC fee rate is product-pinned to 1% (100 bps).
 *
 * Example env wiring (`ui-v3/.env.local`):
 *   VITE_CSW_TREASURY_BTC_MAINNET=bc1q...
 *   VITE_CSW_TREASURY_BTC_TESTNET=tb1q...
 *   VITE_CSW_TREASURY_STX=SP3...
 *   VITE_CSW_FEE_BPS=100         # 100 bps = 1.00%
 *   VITE_CSW_FEE_MIN_SATS=546    # floor so sub-dust payouts aren't wasted
 *   VITE_CSW_FEE_CAP_SATS=50000  # cap so large spends aren't taxed unfairly
 */

type NetworkLabel = "mainnet" | "testnet";

/** Fee anchors in basis points (1 bp = 0.01%). */
const DEFAULT_FEE_BPS = 100; // 1.00%
/** Minimum fee floor. Default 0 so 10bps remains proportional on small locks. */
const DEFAULT_FEE_MIN_SATS = 0;
/** Cap so we don't tax very large spends disproportionately. */
const DEFAULT_FEE_CAP_SATS = 50_000;

function readEnv(key: string): string | undefined {
  // `import.meta.env` is typed loosely by Vite; guard access.
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const v = env?.[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

function readIntEnv(key: string, fallback: number): number {
  const raw = readEnv(key);
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export type PlatformFeeConfig = {
  bps: number;
  minSats: number;
  capSats: number;
  treasuryBtc: Record<NetworkLabel, string | null>;
  treasuryStx: string | null;
};

export const PLATFORM_FEE_CONFIG: PlatformFeeConfig = {
  // Product override: force BTC platform fee to 1% regardless of env.
  bps: DEFAULT_FEE_BPS,
  minSats: readIntEnv("VITE_CSW_FEE_MIN_SATS", DEFAULT_FEE_MIN_SATS),
  capSats: readIntEnv("VITE_CSW_FEE_CAP_SATS", DEFAULT_FEE_CAP_SATS),
  treasuryBtc: {
    mainnet: readEnv("VITE_CSW_TREASURY_BTC_MAINNET") ?? null,
    testnet: readEnv("VITE_CSW_TREASURY_BTC_TESTNET") ?? null,
  },
  treasuryStx: readEnv("VITE_CSW_TREASURY_STX") ?? null,
};

export type PlatformFeeQuote = {
  /** True iff a treasury is configured for the active network AND the fee clears the floor. */
  enabled: boolean;
  feeSats: number;
  treasury: string | null;
  bps: number;
  reason?: "disabled" | "no-treasury" | "below-floor" | "ok";
};

export type PlatformFeeOptions = {
  /**
   * When false, ignore configured min floor and charge proportional bps only.
   * Useful for lock flows where users expect strict % fees.
   */
  enforceMinFloor?: boolean;
};

/**
 * Compute the platform fee for a BTC action (lock, vault send, unlock).
 *
 * The fee is applied to **`amountSats`** (the user-intent amount) and clamped to `[min, cap]`.
 * It does NOT consume from the user's balance beyond `amountSats + mined fee + platformFee`.
 */
export function computeBtcPlatformFee(
  amountSats: number,
  network: NetworkLabel,
  options: PlatformFeeOptions = {}
): PlatformFeeQuote {
  const { bps, minSats, capSats, treasuryBtc } = PLATFORM_FEE_CONFIG;
  const enforceMinFloor = options.enforceMinFloor ?? true;
  const treasury = treasuryBtc[network];

  if (bps <= 0) {
    return { enabled: false, feeSats: 0, treasury, bps: 0, reason: "disabled" };
  }
  if (!treasury) {
    // No treasury configured for this network — silently skip.
    return { enabled: false, feeSats: 0, treasury: null, bps, reason: "no-treasury" };
  }

  const raw = Math.floor((amountSats * bps) / 10_000);
  const minFloor = enforceMinFloor ? minSats : 0;
  const clamped = Math.min(Math.max(raw, minFloor), capSats);

  // Don't charge a fee larger than the amount being moved — absurd edge case.
  const feeSats = Math.min(clamped, Math.max(0, amountSats - 1));
  // If floor is configured and raw fee is smaller, keep the floor. If floor is 0,
  // this preserves exact proportional bps charging.
  if (enforceMinFloor && minSats > 0 && feeSats < minSats) {
    return { enabled: false, feeSats: 0, treasury, bps, reason: "below-floor" };
  }

  return { enabled: true, feeSats, treasury, bps, reason: "ok" };
}

/** Human-formatted "0.10%" style label. */
export function formatFeeBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}
