import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import UnlockDateTimePicker from "@/components/locks/UnlockDateTimePicker";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import PrimaryButton from "@/components/ui/primary-button";
import {
  Lock,
  Bitcoin,
  Layers,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Clock,
  Unlock,
  Trash2,
  Construction,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBtcWallet } from "@/contexts/BtcWalletContext";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import { useWalletContext } from "@/contexts/WalletContext";
import {
  loadBtcLocks,
  createBtcLockRecord,
  updateBtcLock,
  removeBtcLock,
  lockCanSpendOnChain,
  BTC_LOCKS_CHANGED_EVENT,
  type BtcLockRecord,
} from "@/lib/btcLockStorage";
import { resolveOwnerPubkey } from "@/lib/btcOwnerPubkey";
import { tryHealLock } from "@/lib/btcLockHeal";
import {
  recoverAndPersistLocks,
  resolveUnknownUnlockTimes,
  resolveUnknownUnlockTimeForLock,
} from "@/lib/btcLockRecovery";
import { buildUnlockPsbt } from "@/lib/btcLockSpend";
import { buildVaultSpendPsbt } from "@/lib/btcVaultSpend";
import { finalizeCltvSpendPsbt } from "@/lib/btcLockFinalize";
import { getVaultFromRouteId } from "@/lib/vaultRoute";
import { request as stacksRequest, JsonRpcError, JsonRpcErrorCode } from "@stacks/connect";
import {
  getRecommendedFeerates,
  pickFeerateSatPerVb,
  feePresetLabel,
  getBitcoinTxExplorerUrl,
} from "@/services/bitcoinTxService";
import {
  getAddressTxs,
  broadcastRawTx,
  getTxStatus,
  getAddressBalanceSats,
  getTipHeight,
} from "@/services/btcMempoolService";
import { computeBtcPlatformFee, formatFeeBps, PLATFORM_FEE_CONFIG } from "@/lib/platformFee";
import { networkLabelFromAddress } from "@/lib/btcScript";
import { getClientConfig } from "@/utils/chain-config";
import { useToast } from "@/hooks/use-toast";
import { formatBtcFromSats, formatNumber } from "@/utils/numbers";
import { base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";

const SATS_PER_BTC = 1e8;
/** Safe floor — Bitcoin Core dust is 546 sats for P2PKH, 294 for P2WPKH, 330 for P2TR. Use the highest for friendliness. */
const DUST_LIMIT_SATS = 546;

type ParsedRpcError =
  | { kind: "user-cancel" }
  | { kind: "other"; title: string; description: string };

function parseStacksRpcError(err: unknown): ParsedRpcError {
  if (err instanceof JsonRpcError) {
    if (
      err.code === JsonRpcErrorCode.UserRejection ||
      err.code === JsonRpcErrorCode.UserCanceled
    ) {
      return { kind: "user-cancel" };
    }
    const title =
      err.code === JsonRpcErrorCode.MethodNotFound
        ? "Wallet does not support sendTransfer"
        : err.code === JsonRpcErrorCode.InvalidParams
          ? "Wallet rejected the parameters"
          : err.code === JsonRpcErrorCode.MethodAddressMismatch
            ? "Address mismatch"
            : err.code === JsonRpcErrorCode.MethodAccessDenied
              ? "Wallet denied the request"
              : "Could not broadcast";
    const description = [err.message, err.data].filter(Boolean).join(" · ") || "Wallet returned an RPC error.";
    return { kind: "other", title, description };
  }
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (lower.includes("cancel") || lower.includes("reject")) {
    return { kind: "user-cancel" };
  }
  return {
    kind: "other",
    title: "Could not broadcast",
    description: message || "Wallet call failed.",
  };
}

function generateLockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `csw-btc-lock-${Date.now()}`;
}

function satsToBtcString(sats: number): string {
  if (sats <= 0) return "";
  const s = (sats / SATS_PER_BTC).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

function tryFinalizeHex(psbtBase64: string): string | null {
  try {
    const tx = Transaction.fromPSBT(base64.decode(psbtBase64));
    tx.finalize();
    return tx.hex;
  } catch {
    return null;
  }
}

const PERCENT_CHIPS = [10, 25, 50, 75, 100] as const;

/**
 * Relative-time formatter. Works in both directions (past / future) and handles sub-minute
 * gaps so freshly created rows don't render as "in 0 min" or "in ~0 h" — they render as
 * "just now" / "in a moment".
 */
/**
 * Format the time between `unixSec` and `now` with a "preferred" direction. If the actual
 * direction of the diff contradicts the caller's hint (e.g. a `"past"` caller passed a
 * timestamp that is in the future), we flip to the honest direction rather than emit a lie.
 * This protects against small clock skew (node vs client) *and* genuine future data.
 */
function formatRelativeTime(unixSec: number, now: number, direction: "future" | "past"): string {
  const rawMs = unixSec * 1000 - now;
  const absMs = Math.abs(rawMs);
  if (absMs <= 30_000) return "just now";
  const actuallyFuture = rawMs > 0;
  const label = (isFuture: boolean, core: string) => (isFuture ? `in ${core}` : `${core} ago`);
  const round = actuallyFuture ? Math.ceil : Math.floor;
  const sec = Math.max(1, round(absMs / 1000));
  if (sec < 60) return label(actuallyFuture, `${sec}s`);
  const min = Math.max(1, round(sec / 60));
  if (min < 60) return label(actuallyFuture, `${min} min`);
  const h = Math.max(1, round(min / 60));
  if (h < 48) return label(actuallyFuture, `${h} h`);
  const d = Math.max(1, round(h / 24));
  if (d < 60) return label(actuallyFuture, `${d} d`);
  const mo = Math.max(1, round(d / 30));
  return label(actuallyFuture, `~${mo} mo`);
  // `direction` is now just a hint kept in the signature for compatibility; the function
  // always tells the truth about whether the event is past or future.
  void direction;
}

/** Render an absolute timestamp plus the user's TZ abbreviation, so there's no ambiguity. */
function formatAbsolute(unixMs: number): string {
  const d = new Date(unixMs);
  const tz = d
    .toLocaleTimeString(undefined, { timeZoneName: "short" })
    .split(" ")
    .pop();
  return `${d.toLocaleString()} ${tz ?? ""}`.trim();
}

function formatAbsoluteUtc(unixMs: number): string {
  return new Date(unixMs).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

type LockStatusChip = {
  label: string;
  icon: React.ReactNode;
  className: string;
};

function chipFor(lock: BtcLockRecord, now: number): LockStatusChip {
  // Terminal state first.
  if (lock.status === "spent") {
    return {
      label: "Unlocked · swept",
      icon: <Check className="h-3 w-3" />,
      className: "bg-emerald-700/25 text-emerald-200 border-emerald-700/60",
    };
  }
  const unlockTimeKnown =
    Number.isFinite(lock.unlockUnixSec) && lock.unlockUnixSec > 500_000_000;
  const windowOpen = unlockTimeKnown && lock.unlockUnixSec * 1000 <= now;
  const unrecoverableUnknown =
    !unlockTimeKnown &&
    Boolean(lock.unknownUnlockUnrecoverable || lock.note?.toLowerCase().includes("not a csw lock script"));
  // Window-open is derived purely from wall-clock so the UI never lies regardless
  // of what the persisted status field happens to be. Covers `unlockable`, stale
  // `confirmed`, and even `broadcast` rows whose unlock date has already passed.
  if (unrecoverableUnknown && lock.txid) {
    return {
      label: "Not a CSW lock script",
      icon: <AlertTriangle className="h-3 w-3" />,
      className: "bg-rose-700/20 text-rose-200 border-rose-700/50",
    };
  }
  if (!unlockTimeKnown && lock.txid) {
    return {
      label: "Recovering unlock time…",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: "bg-amber-600/20 text-amber-200 border-amber-700/50",
    };
  }
  if (windowOpen && lock.txid) {
    return {
      label: "Unlock window open",
      icon: <Unlock className="h-3 w-3" />,
      className: "bg-emerald-600/20 text-emerald-300 border-emerald-700/50",
    };
  }
  if (lock.status === "confirmed") {
    return {
      label: "Locked · confirmed",
      icon: <Lock className="h-3 w-3" />,
      className: "bg-amber-600/20 text-amber-200 border-amber-700/50",
    };
  }
  if (lock.status === "broadcast") {
    return {
      label: "Broadcast · waiting",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: "bg-slate-600/30 text-slate-200 border-slate-600",
    };
  }
  return {
    label: "Pending — not funded",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-slate-600/20 text-slate-300 border-slate-700",
  };
}

/** Per-lock on-chain snapshot fetched by the polling layer. Keyed by lock.id. */
type LockOnChainState = {
  /** Current balance at the P2WSH lock address (sats). */
  lockBalanceSats: number | null;
  /** Confirmations of the funding tx. 0 = in mempool, null = unknown. */
  confirmations: number | null;
  /** Confirmations of the sweep tx, if one has been broadcast. */
  spendConfirmations: number | null;
};

function LockRow({ lock, now, onCopied, btcUsd, onUnlock, unlocking, onChainState }: {
  lock: BtcLockRecord;
  now: number;
  onCopied: (what: string) => void;
  btcUsd: number | null;
  onUnlock: (lock: BtcLockRecord) => Promise<void>;
  unlocking: boolean;
  onChainState?: LockOnChainState;
}) {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const chip = chipFor(lock, now);
  // Records produced by chain-side recovery without a resolved unlock time use
  // `unlockUnixSec = 0` as a sentinel. Treat this as "unknown" rather than
  // 1970-01-01 so the UI doesn't lie to the user.
  const unlockTimeUnknown = !Number.isFinite(lock.unlockUnixSec) || lock.unlockUnixSec <= 0;
  const unlockUnknownUnrecoverable =
    unlockTimeUnknown &&
    Boolean(lock.unknownUnlockUnrecoverable || lock.note?.toLowerCase().includes("not a csw lock script"));
  const unlockMs = lock.unlockUnixSec * 1000;
  // Prefer the on-chain first-confirmation time (authoritative) — fall back to local `createdAt`
  // only while the tx is still in the mempool or never funded.
  const fundedMs = lock.fundedAtUnixSec != null ? lock.fundedAtUnixSec * 1000 : null;
  const localCreatedMs = Date.parse(lock.createdAt);
  const fundedLooksFuture = fundedMs != null && fundedMs - now > 2 * 60 * 1000;
  const displayedCreatedMs =
    fundedMs != null && !fundedLooksFuture
      ? fundedMs
      : (Number.isFinite(localCreatedMs) ? localCreatedMs : fundedMs);
  const createdLabel =
    fundedMs != null && !fundedLooksFuture ? "Funded (confirmed)" : lock.txid ? "Created" : "Created (local)";
  const unlockStr = formatAbsolute(unlockMs);
  const unlockUtcStr = formatAbsoluteUtc(unlockMs);
  const createdStr = displayedCreatedMs != null ? formatAbsolute(displayedCreatedMs) : lock.createdAt;
  const createdUtcStr = displayedCreatedMs != null ? formatAbsoluteUtc(displayedCreatedMs) : null;
  const usd = btcUsd ? `$${formatNumber((lock.amountSats / SATS_PER_BTC) * btcUsd, 2)}` : null;
  const explorerUrl = lock.txid ? getBitcoinTxExplorerUrl(lock.txid, lock.ownerBtcAddress) : null;
  const spendExplorerUrl = lock.spendTxid ? getBitcoinTxExplorerUrl(lock.spendTxid, lock.ownerBtcAddress) : null;
  const onChain = lockCanSpendOnChain(lock);
  // If we don't know the unlock time, we cannot say whether the window is open;
  // disable unlock-side controls until the background recovery resolves it.
  const windowOpen = !unlockTimeUnknown && unlockMs <= now;
  const missingScriptFields = !onChain;
  const notYetFunded = !lock.txid;
  const alreadySpent = lock.status === "spent";
  const canAttemptRecover =
    unlockTimeUnknown && !unlockUnknownUnrecoverable && !notYetFunded && !alreadySpent;
  // If script fields are missing but we have a funding txid, we can still try to
  // recover the script on click (`tryHealLock`). Only block the click when the lock
  // was never funded on-chain.
  const canUnlock = !notYetFunded && !alreadySpent && (windowOpen || canAttemptRecover);
  const showUnlockControl = (windowOpen || canAttemptRecover) && !alreadySpent;
  const disabledReason = notYetFunded
    ? "Funding tx not seen on-chain yet. Wait for the first confirmation."
    : null;
  const needsHeal = missingScriptFields && !notYetFunded;

  // One-shot diagnostic: if the unlock window is open but we're disabling the button, log
  // exactly which field is missing so this doesn't look like a silent bug.
  useEffect(() => {
    if (windowOpen && !canUnlock && !alreadySpent) {
      console.warn("[csw-locker] Unlock window open but lock can't be swept:", {
        id: lock.id,
        txid: lock.txid,
        hasWitnessScript: Boolean(lock.witnessScriptHex),
        hasScriptPubkey: Boolean(lock.scriptPubkeyHex),
        hasOwnerPubkey: Boolean(lock.ownerPubkey),
        status: lock.status,
      });
    }
  }, [
    windowOpen,
    canUnlock,
    alreadySpent,
    lock.id,
    lock.txid,
    lock.witnessScriptHex,
    lock.scriptPubkeyHex,
    lock.ownerPubkey,
    lock.status,
  ]);

  const handleCopy = (text: string, setFlag: (v: boolean) => void, label: string) => {
    void navigator.clipboard.writeText(text);
    setFlag(true);
    onCopied(label);
    setTimeout(() => setFlag(false), 1500);
  };

  return (
    <Collapsible
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
      className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-white font-semibold text-xs sm:text-sm">
          <Bitcoin className="h-4 w-4 text-amber-400" />
          <span className="tabular-nums break-all">{formatBtcFromSats(lock.amountSats)}</span>
          <span className="text-[10px] text-amber-200/80 font-bold">BTC</span>
          <span
            className={cn(
              "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border font-semibold",
              lock.sourceVaultId
                ? "text-purple-200 border-purple-700/60 bg-purple-900/30"
                : "text-slate-300 border-slate-700 bg-slate-800/70"
            )}
          >
            {lock.sourceVaultId ? "Vault" : "Wallet"}
          </span>
          {usd && <span className="text-[10px] sm:text-xs text-slate-400 font-normal ml-1">{usd}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${chip.className}`}>
            {chip.icon}
            {chip.label}
          </span>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              Details
              <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", detailsOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold mb-1">Unlocks</div>
          {unlockTimeUnknown ? (
            <>
              <div className={unlockUnknownUnrecoverable ? "text-rose-200" : "text-amber-200"}>
                {unlockUnknownUnrecoverable ? "Not a CSW lock script" : "Unknown — recovering…"}
              </div>
              <div className="text-slate-500 text-[11px]">
                {unlockUnknownUnrecoverable
                  ? "This funded output does not match a CSW lock witness script."
                  : "We're scanning the chain to find this lock's unlock time."}
              </div>
            </>
          ) : (
            <>
              <div className="text-slate-200">{unlockStr}</div>
              <div className="text-slate-500 text-[11px]">{unlockUtcStr}</div>
              <div className="text-slate-500 text-[11px]">{formatRelativeTime(lock.unlockUnixSec, now, "future")}</div>
            </>
          )}
        </div>
        <div>
          <div className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold mb-1">
            {createdLabel}
          </div>
          <div className="text-slate-200">{createdStr}</div>
          {createdUtcStr && <div className="text-slate-500 text-[11px]">{createdUtcStr}</div>}
          {displayedCreatedMs != null && (
            <div className="text-slate-500 text-[11px]">
              {formatRelativeTime(Math.floor(displayedCreatedMs / 1000), now, "past")}
            </div>
          )}
        </div>
      </div>

      {fundedLooksFuture && (
        <div className="rounded-md border border-amber-900/40 bg-amber-950/20 p-2 text-[11px] text-amber-200/90">
          Funding confirmation time from the indexer is ahead of your local clock. Using local created time until they converge.
        </div>
      )}

      {showUnlockControl && disabledReason && (
        <div className="rounded-md border border-amber-900/40 bg-amber-950/20 p-2 text-[11px] text-amber-200/90">
          {disabledReason}
        </div>
      )}
      {showUnlockControl && needsHeal && !disabledReason && (
        <div className="rounded-md border border-sky-900/40 bg-sky-950/20 p-2 text-[11px] text-sky-200/90">
          On-chain script not cached locally — we'll re-derive it from your wallet on click.
        </div>
      )}
      {unlockUnknownUnrecoverable && (
        <div className="rounded-md border border-rose-900/40 bg-rose-950/20 p-2 text-[11px] text-rose-200/90">
          Exhaustive recovery attempts did not map this output to a CSW lock script. You can keep it in history, but it won't unlock through the CSW lock flow.
        </div>
      )}

      <div className="flex justify-end gap-2">
        {showUnlockControl && (
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-900/40 disabled:text-emerald-200/50"
            disabled={unlocking || !canUnlock}
            onClick={() => void onUnlock(lock)}
            title={
              disabledReason ??
              (unlockTimeUnknown
                ? "Recover unlock time and sweep"
                : needsHeal
                  ? "Recover script and sweep"
                  : "Sweep locked BTC back to your wallet")
            }
          >
            {unlocking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Signing…
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 mr-1" />
                {unlockTimeUnknown
                  ? "Recover time & unlock"
                  : needsHeal
                    ? "Recover & sweep"
                    : "Unlock & sweep"}
              </>
            )}
          </Button>
        )}
      </div>

      <CollapsibleContent className="space-y-3">
        {(onChainState?.lockBalanceSats != null || onChainState?.confirmations != null) && (
          <div className="grid sm:grid-cols-3 gap-3 text-xs rounded-md border border-slate-700/60 bg-slate-900/40 p-2.5">
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wide">On-chain balance</div>
              <div className="text-slate-200 tabular-nums">
                {onChainState.lockBalanceSats != null
                  ? `${formatBtcFromSats(onChainState.lockBalanceSats)} BTC`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wide">Funding tx</div>
              <div className="text-slate-200">
                {onChainState.confirmations == null
                  ? "—"
                  : onChainState.confirmations === 0
                    ? "In mempool"
                    : `${onChainState.confirmations} conf.`}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wide">Sweep tx</div>
              <div className="text-slate-200">
                {lock.spendTxid == null
                  ? "—"
                  : onChainState.spendConfirmations == null
                    ? "In mempool"
                    : onChainState.spendConfirmations === 0
                      ? "In mempool"
                      : `${onChainState.spendConfirmations} conf.`}
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold mb-1 flex items-center gap-2">
            Lock address
            {!onChain && (
              <span className="text-[9px] font-bold text-amber-300 bg-amber-950/40 border border-amber-900/50 rounded px-1.5 py-0.5">
                LEGACY
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] break-all text-slate-300">{lock.lockAddress}</span>
            <button
              type="button"
              className="p-1 rounded hover:bg-slate-700/70"
              onClick={() => handleCopy(lock.lockAddress, setCopiedAddr, "Lock address copied")}
              aria-label="Copy lock address"
            >
              {copiedAddr ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            </button>
          </div>
          {!onChain && (
            <div className="text-[10px] text-amber-300/80 mt-1">
              {unlockTimeUnknown
                ? "Recovered from chain. Use \"Recover time & unlock\" to finalize this lock."
                : "Older preview lock. Remove and re-create to get real on-chain enforcement."}
            </div>
          )}
        </div>

        {lock.txid && (
          <div>
            <div className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold mb-1">Funding tx</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] break-all text-slate-300">{lock.txid}</span>
              <button
                type="button"
                className="p-1 rounded hover:bg-slate-700/70"
                onClick={() => handleCopy(lock.txid!, setCopiedTx, "Tx id copied")}
                aria-label="Copy transaction id"
              >
                {copiedTx ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              </button>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-purple-300 text-xs hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Explorer
                </a>
              )}
            </div>
          </div>
        )}

        {lock.spendTxid && (
          <div>
            <div className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold mb-1">Unlock tx</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] break-all text-emerald-300">{lock.spendTxid}</span>
              {spendExplorerUrl && (
                <a
                  href={spendExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-300 text-xs hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Explorer
                </a>
              )}
            </div>
          </div>
        )}

        {lock.note && (
          <p className="text-xs text-slate-400">
            <span className="text-slate-500">Note:</span> {lock.note}
          </p>
        )}

        {/* Real on-chain locks can't be "removed" — only local rows can. */}
        {(lock.status === "pending" && !lock.txid) || !onChain || lock.status === "spent" ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-300"
              onClick={() => removeBtcLock(lock.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove from list
            </Button>
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

const Locks = () => {
  const { walletId } = useParams<{ walletId: `${string}.${string}` }>();
  const vaultFromRoute = getVaultFromRouteId(walletId);
  const isVaultMode = vaultFromRoute != null;
  const { activeBtcAddress, connectBtcWallet, connecting, refreshBtc, balanceSats, loadingBalance } = useBtcWallet();
  const { btcUsd } = useAssetPrices();
  const { walletData } = useWalletContext();
  const { toast } = useToast();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [vaultBalanceSats, setVaultBalanceSats] = useState<number | null>(null);
  const [vaultFunding, setVaultFunding] = useState(false);

  const [locks, setLocks] = useState<BtcLockRecord[]>(() =>
    typeof window !== "undefined" ? loadBtcLocks() : []
  );
  const [onChainByLockId, setOnChainByLockId] = useState<Record<string, LockOnChainState>>({});
  const [now, setNow] = useState(() => Date.now());
  const [amount, setAmount] = useState("");
  const [unlockAt, setUnlockAt] = useState<Date | null>(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setSeconds(0, 0);
    return d;
  });
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [fees, setFees] = useState<Awaited<ReturnType<typeof getRecommendedFeerates>>>(null);
  // Collapsed by default so existing locks dominate the viewport. Toggled open
  // when the user wants to lock fresh funds; auto-collapses again after a
  // successful broadcast so the new entry slides into the locks list cleanly.
  const [newLockOpen, setNewLockOpen] = useState(false);

  useEffect(() => {
    const sync = () => setLocks(loadBtcLocks());
    window.addEventListener(BTC_LOCKS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      window.removeEventListener(BTC_LOCKS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
      clearInterval(t);
    };
  }, []);

  // Instant client-side status promotion: flip any `confirmed` row whose unlock time
  // has already passed over to `unlockable` on mount, so we don't wait a full poll
  // cycle for the persisted state to catch up with wall-clock time.
  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    let promoted = false;
    for (const l of loadBtcLocks()) {
      if (l.status === "confirmed" && l.unlockUnixSec <= nowSec) {
        updateBtcLock(l.id, { status: "unlockable" });
        promoted = true;
      }
    }
    if (promoted) setLocks(loadBtcLocks());
  }, []);

  useEffect(() => {
    if (!activeBtcAddress) return;
    void getRecommendedFeerates(activeBtcAddress).then(setFees);
  }, [activeBtcAddress]);

  useEffect(() => {
    if (!vaultFromRoute) {
      setVaultBalanceSats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const next = await getAddressBalanceSats(vaultFromRoute.derivedVaultAddress);
        if (!cancelled) setVaultBalanceSats(next);
      } catch {
        if (!cancelled) setVaultBalanceSats(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultFromRoute?.id, vaultFromRoute?.derivedVaultAddress]);

  // Passive migration: any lock belonging to the connected wallet that's missing
  // script fields gets backfilled in the background so the "Unlock & sweep" button
  // goes from disabled → enabled automatically, without any user action.
  useEffect(() => {
    if (!activeBtcAddress) return;
    let cancelled = false;
    (async () => {
      const candidates = loadBtcLocks().filter(
        (l) => l.ownerBtcAddress === activeBtcAddress && !lockCanSpendOnChain(l)
      );
      if (candidates.length === 0) return;
      let anyHealed = false;
      for (const lock of candidates) {
        if (cancelled) return;
        try {
          const r = await tryHealLock(lock, walletData);
          if (r.ok && r.healed) anyHealed = true;
        } catch {
          // swallow — we'll retry next mount
        }
      }
      if (!cancelled && anyHealed) {
        setLocks(loadBtcLocks());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBtcAddress, walletData]);

  /**
   * On-chain fallback: when localStorage doesn't already track every lock the user
   * created (fresh browser, cleared site data, restarted dev server on a new port,
   * etc.), scan the connected BTC address's recent transactions and reconstruct
   * lock records from on-chain data. Two paths:
   *
   *   1. Spent locks → fully recovered (the spend tx's witness reveals the
   *      original CLTV witness script, which encodes both `unlockUnixSec` and the
   *      owner pubkey).
   *   2. Unspent P2WSH outputs the owner funded → enqueued as candidates;
   *      `recoverAndPersistLocks` runs a tiered brute-force on the unlock time in
   *      the background and patches the records when it finds a match.
   *
   * Runs once per (address, sessionPubkey) pair to avoid hammering mempool.space.
   */
  const recoveryRanForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeBtcAddress) return;
    // Pull the owner's pubkey straight from the session — never prompt the wallet
    // here. Without a pubkey we can still recover *spent* locks (the witness
    // reveals it), so we run the scan either way.
    const sessionPubkey = (() => {
      if (!walletData) return undefined;
      const all = [
        walletData.preferredBtc,
        walletData.taprootBtc,
        ...(walletData.addresses?.btc ?? []),
      ].filter(Boolean) as Array<{ address: string; publicKey?: string }>;
      const hit = all.find((a) => a.address === activeBtcAddress && a.publicKey);
      return hit?.publicKey?.toLowerCase().replace(/^0x/, "");
    })();
    const cacheKey = `${activeBtcAddress}|${sessionPubkey ?? ""}`;
    const alreadyRan = recoveryRanForRef.current === cacheKey;
    recoveryRanForRef.current = cacheKey;

    let cancelled = false;
    (async () => {
      try {
        // Full address-history scan only on first mount per (addr, pubkey).
        // Subsequent renders of the same pair just retry the brute-force on
        // any persisted candidates that are still missing an unlock time.
        if (!alreadyRan) {
          const result = await recoverAndPersistLocks({
            ownerAddress: activeBtcAddress,
            ownerPubkeyHex: sessionPubkey,
          });
          if (cancelled) return;
          if (result.added.length > 0) {
            setLocks(loadBtcLocks());
            toast({
              title: `Recovered ${result.added.length} lock${result.added.length === 1 ? "" : "s"} from chain`,
              description:
                "We rebuilt these from your address history. Funds were always safe on-chain.",
            });
          }
        } else if (sessionPubkey) {
          // Re-run the brute-force only — quick, no network cost.
          const { resolved } = await resolveUnknownUnlockTimes({
            ownerAddress: activeBtcAddress,
            ownerPubkeyHex: sessionPubkey,
          });
          if (cancelled) return;
          if (resolved > 0) {
            setLocks(loadBtcLocks());
            toast({
              title: `Resolved ${resolved} lock${resolved === 1 ? "" : "s"}`,
              description: "Unlock times recovered — these locks are now sweepable.",
            });
          }
        }
      } catch (e) {
        console.warn("Lock recovery failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBtcAddress, walletData, toast]);

  const myLocks = useMemo(
    () =>
      (isVaultMode && vaultFromRoute
        ? locks.filter((l) => l.sourceVaultId === vaultFromRoute.id)
        : activeBtcAddress
          ? locks.filter((l) => l.ownerBtcAddress === activeBtcAddress && !l.sourceVaultId)
          : locks.filter((l) => !l.sourceVaultId)
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [locks, activeBtcAddress, isVaultMode, vaultFromRoute]
  );

  // Smart poller: adaptive cadence (fast when there's work to do, slow when everything is settled).
  // Also surfaces authoritative on-chain state per lock (balance, confirmations, sweep status).
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const poll = async (): Promise<{ hasWork: boolean }> => {
      const current = loadBtcLocks();
      let hasWork = false;
      const stateUpdates: Record<string, LockOnChainState> = {};

      // 1) Status probe for every lock with a txid — direct /tx/{txid}/status.
      const withTxid = current.filter((l) => l.txid && l.status !== "spent");
      for (const l of withTxid) {
        if (cancelled) return { hasWork };
        const network = getClientConfig(l.ownerBtcAddress).network;
        try {
          const [status, tipHeight, balance] = await Promise.all([
            getTxStatus(l.txid!, network),
            getTipHeight(l.ownerBtcAddress),
            getAddressBalanceSats(l.lockAddress),
          ]);
          if (cancelled) return { hasWork };

          const confirmations =
            status?.confirmed && status.block_height && tipHeight
              ? Math.max(0, tipHeight - status.block_height + 1)
              : status
                ? 0
                : null;
          stateUpdates[l.id] = {
            lockBalanceSats: balance,
            confirmations,
            spendConfirmations: null,
          };

          if (status?.confirmed) {
            const nextStatus: BtcLockRecord["status"] =
              l.unlockUnixSec * 1000 <= Date.now() ? "unlockable" : "confirmed";
            const patch: Partial<BtcLockRecord> = {};
            if (l.status !== nextStatus) patch.status = nextStatus;
            if (l.fundedAtUnixSec == null && typeof status.block_time === "number") {
              patch.fundedAtUnixSec = status.block_time;
            }
            if (Object.keys(patch).length > 0) updateBtcLock(l.id, patch);
          } else {
            hasWork = true;
          }

          // Check the sweep tx separately so it continues updating after status === "spent".
          if (l.spendTxid) {
            const sStatus = await getTxStatus(l.spendTxid, network);
            if (cancelled) return { hasWork };
            const sConf =
              sStatus?.confirmed && sStatus.block_height && tipHeight
                ? Math.max(0, tipHeight - sStatus.block_height + 1)
                : sStatus
                  ? 0
                  : null;
            stateUpdates[l.id] = { ...stateUpdates[l.id], spendConfirmations: sConf };
            if (!sStatus?.confirmed) hasWork = true;
          }
        } catch {
          // best-effort — keep polling
        }
      }

      // 2) Auto-link any still-pending lock (txid === null) to its funding tx by scanning
      //    the owner's history for an outgoing output to `lockAddress` with the expected value.
      const pending = current.filter((l) => !l.txid && l.status === "pending");
      if (pending.length > 0) {
        hasWork = true;
        const ownerAddrs = Array.from(new Set(pending.map((l) => l.ownerBtcAddress)));
        for (const owner of ownerAddrs) {
          if (cancelled) return { hasWork };
          try {
            const txs = await getAddressTxs(owner);
            if (cancelled) return { hasWork };
            for (const l of pending.filter((p) => p.ownerBtcAddress === owner)) {
              const match = txs.find((t) =>
                (t.vout ?? []).some(
                  (o) => o.scriptpubkey_address === l.lockAddress && o.value === l.amountSats
                )
              );
              if (match) {
                const confirmed = Boolean(match.status?.confirmed);
                const nextStatus: BtcLockRecord["status"] = confirmed
                  ? l.unlockUnixSec * 1000 <= Date.now()
                    ? "unlockable"
                    : "confirmed"
                  : "broadcast";
                const patch: Partial<BtcLockRecord> = { txid: match.txid, status: nextStatus };
                if (confirmed && typeof match.status?.block_time === "number") {
                  patch.fundedAtUnixSec = match.status.block_time;
                }
                updateBtcLock(l.id, patch);
              }
            }
          } catch {
            // ignore
          }
        }
      }

      if (Object.keys(stateUpdates).length > 0 && !cancelled) {
        setOnChainByLockId((prev) => ({ ...prev, ...stateUpdates }));
      }
      return { hasWork };
    };

    // Adaptive back-off: 5s → 10s → 20s → 45s → 45s…
    const INTERVALS = [5_000, 10_000, 20_000, 45_000];
    let step = 0;

    const loop = async () => {
      if (cancelled) return;
      const { hasWork } = await poll();
      if (cancelled) return;
      step = hasWork ? Math.min(step, 1) : Math.min(step + 1, INTERVALS.length - 1);
      const delay = INTERVALS[step];
      timer = window.setTimeout(loop, delay);
    };

    void loop();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        step = 0;
        if (timer != null) window.clearTimeout(timer);
        void loop();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Re-run whenever the set of locks changes so a fresh creation triggers the fast cadence.
  }, [locks.length]);

  const amountSats = Math.round(parseFloat(amount || "0") * SATS_PER_BTC);
  const unlockComposed = unlockAt;
  const unlockUnixSec = unlockAt ? Math.floor(unlockAt.getTime() / 1000) : null;
  const minUnlockUnix = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
  const unlockInFuture = unlockUnixSec !== null && unlockUnixSec > minUnlockUnix;

  const availableSats = isVaultMode ? (vaultBalanceSats ?? 0) : (balanceSats ?? 0);
  const hasBalance = availableSats > 0;
  const percentOfBalance =
    hasBalance && amountSats > 0
      ? Math.min(100, Math.round((amountSats / availableSats) * 100))
      : 0;
  const exceedsBalance = hasBalance && amountSats > availableSats;
  const amountUsd = amountSats > 0 && btcUsd ? (amountSats / SATS_PER_BTC) * btcUsd : null;
  const availableUsd = hasBalance && btcUsd ? (availableSats / SATS_PER_BTC) * btcUsd : null;

  const networkForFee = isVaultMode && vaultFromRoute
    ? (vaultFromRoute.network ?? networkLabelFromAddress(vaultFromRoute.linkedBtcAddress))
    : activeBtcAddress
      ? networkLabelFromAddress(activeBtcAddress)
      : "mainnet";
  const platformFeeQuote = useMemo(
    () => computeBtcPlatformFee(amountSats, networkForFee, { enforceMinFloor: false }),
    [amountSats, networkForFee]
  );
  const platformFeeUsd =
    platformFeeQuote.enabled && btcUsd
      ? (platformFeeQuote.feeSats / SATS_PER_BTC) * btcUsd
      : null;
  // Create-lock request sends one recipient (the lock address). Platform fee for
  // lock management is charged on unlock/sweep to avoid multi-recipient wallet
  // modal bugs seen in some providers.
  const totalSpendSats = amountSats;
  const exceedsBalanceWithFee = hasBalance && amountSats > availableSats;

  const canSubmit =
    Boolean(isVaultMode ? vaultFromRoute : activeBtcAddress) &&
    amountSats > 0 &&
    !exceedsBalance &&
    !exceedsBalanceWithFee &&
    unlockInFuture &&
    !creating;

  const applyPercent = (pct: number) => {
    if (!hasBalance) return;
    const nextSats = Math.max(0, Math.floor((availableSats * pct) / 100));
    setAmount(satsToBtcString(nextSats));
  };

  const feerate = fees ? pickFeerateSatPerVb(fees, "halfHour") : null;

  const handleCreateLock = async () => {
    const ownerAddress = isVaultMode ? vaultFromRoute?.linkedBtcAddress : activeBtcAddress;
    if (!ownerAddress || amountSats <= 0 || !unlockUnixSec) return;
    if (amountSats < DUST_LIMIT_SATS) {
      toast({
        title: "Amount too small",
        description: `Must be at least ${DUST_LIMIT_SATS.toLocaleString()} sats (~0.0000055 BTC) to clear the Bitcoin dust limit.`,
        variant: "destructive",
      });
      return;
    }
    const totalOut = amountSats;
    if (availableSats != null && totalOut > availableSats) {
      toast({
        title: "Insufficient balance",
        description: `Available balance is ${formatBtcFromSats(availableSats)} BTC. Lower the amount so fees still fit.`,
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    if (isVaultMode) setVaultFunding(true);
    const lockId = generateLockId();
    let record: BtcLockRecord | null = null;
    try {
      const fallbackVaultPubkey = isVaultMode ? vaultFromRoute?.signerPubkeys?.[0] : undefined;
      const publicKeyHex = fallbackVaultPubkey
        ? fallbackVaultPubkey
        : (
            await resolveOwnerPubkey(walletData, ownerAddress, {
              allowWalletRpc: true,
            })
          ).publicKeyHex;
      record = createBtcLockRecord({
        id: lockId,
        sourceVaultId: isVaultMode ? vaultFromRoute?.id : undefined,
        ownerBtcAddress: ownerAddress,
        ownerPubkeyHex: publicKeyHex,
        amountSats,
        amountBtc: amount,
        unlockUnixSec,
        note: note.trim() || undefined,
      });
      if (isVaultMode && vaultFromRoute) {
        const built = await buildVaultSpendPsbt({
          vault: vaultFromRoute,
          recipientAddress: record.lockAddress,
          amountSats,
        });
        const signInputs = Array.from({ length: built.inputCount }, (_, i) => i);
        const signed = await stacksRequest("signPsbt", {
          psbt: built.psbtBase64,
          signInputs,
          broadcast: false,
          network: built.network,
        });
        if (!signed?.psbt) throw new Error("Wallet returned no signed PSBT.");
        const rawHex = tryFinalizeHex(signed.psbt);
        if (!rawHex) {
          throw new Error(
            "Vault lock funding needs more signatures. Use vault send flow to collect co-signer approvals, then retry lock funding."
          );
        }
        const txid = await broadcastRawTx(rawHex, built.network);
        updateBtcLock(lockId, { txid, status: "broadcast" });
      } else {
        const network = getClientConfig(ownerAddress).network;
        const recipients: Array<{ address: string; amount: number }> = [
          { address: record.lockAddress, amount: amountSats },
        ];
        const res = await stacksRequest("sendTransfer", { recipients, network });
        if (!res?.txid) {
          removeBtcLock(lockId);
          toast({
            title: "No txid returned",
            description: "Wallet did not return a transaction id.",
            variant: "destructive",
          });
          return;
        }
        updateBtcLock(lockId, { txid: res.txid, status: "broadcast" });
      }
      toast({
        title: "Lock funded",
        description: isVaultMode
          ? "Vault funds locked until your chosen date."
          : "Funds locked until your chosen date.",
      });
      setAmount("");
      setNote("");
      const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
      next.setSeconds(0, 0);
      setUnlockAt(next);
      setNewLockOpen(false);
      if (isVaultMode && vaultFromRoute) {
        const refreshed = await getAddressBalanceSats(vaultFromRoute.derivedVaultAddress);
        setVaultBalanceSats(refreshed);
      } else {
        void refreshBtc();
      }
    } catch (e) {
      if (record) removeBtcLock(lockId);
      const parsed = parseStacksRpcError(e);
      if (parsed.kind === "user-cancel") {
        toast({ title: "Cancelled" });
      } else {
        console.error("sendTransfer failed", e);
        toast({
          title: parsed.title,
          description: parsed.description,
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
      setVaultFunding(false);
    }
  };

  const handleUnlock = async (lockArg: BtcLockRecord) => {
    setUnlockingId(lockArg.id);
    let lock = lockArg;
    try {
      // User-driven fallback for recovered candidates (`unlockUnixSec = 0`):
      // resolve unlock time on click for this one lock, then continue unlock flow.
      if (!Number.isFinite(lock.unlockUnixSec) || lock.unlockUnixSec <= 500_000_000) {
        if (!walletData) {
          toast({
            title: "Can't unlock yet",
            description: "Reconnect the wallet that funded this lock, then try again.",
            variant: "destructive",
          });
          return;
        }
        const candidatePubkeys = Array.from(
          new Set(
            [
              lock.ownerPubkey,
              walletData.preferredBtc?.address === lock.ownerBtcAddress
                ? walletData.preferredBtc?.publicKey
                : undefined,
              walletData.taprootBtc?.address === lock.ownerBtcAddress
                ? walletData.taprootBtc?.publicKey
                : undefined,
              ...(walletData.addresses?.btc
                ?.filter((a) => a.address === lock.ownerBtcAddress)
                .map((a) => a.publicKey) ?? []),
            ]
              .filter(Boolean)
              .map((pk) => String(pk).toLowerCase().replace(/^0x/, ""))
          )
        );
        if (candidatePubkeys.length === 0) {
          const viaWallet = await resolveOwnerPubkey(walletData, lock.ownerBtcAddress, {
            allowWalletRpc: true,
          });
          candidatePubkeys.push(viaWallet.publicKeyHex.toLowerCase().replace(/^0x/, ""));
        }
        let forced: Awaited<ReturnType<typeof resolveUnknownUnlockTimeForLock>> | null = null;
        for (const ownerPubkeyHex of candidatePubkeys) {
          const attempt = await resolveUnknownUnlockTimeForLock({ lock, ownerPubkeyHex });
          if (attempt.resolved && attempt.lock) {
            forced = attempt;
            break;
          }
        }
        if (forced?.resolved && forced.lock) {
          lock = forced.lock;
          setLocks(loadBtcLocks());
        } else {
          toast({
            title: "Unlock time not resolved yet",
            description: "Continuing with a full-balance sweep attempt for this lock.",
          });
        }
      }

      if (!lockCanSpendOnChain(lock)) {
        // User action — OK to prompt the wallet via `getAddresses` if needed.
        const healed = await tryHealLock(lock, walletData, { allowWalletPrompt: true });
        if (healed.ok === false) {
          toast({
            title: "Can't sweep this lock",
            description: healed.reason,
            variant: "destructive",
          });
          return;
        }
        lock = healed.lock;
        if (healed.healed) {
          setLocks(loadBtcLocks());
          toast({
            title: "Lock repaired",
            description: "Recovered the on-chain script from your wallet — sweeping now.",
          });
        }
      }
      const built = await buildUnlockPsbt(lock);
      // `@stacks/connect` ≥ 8 hard-requires `signInputs` at runtime for Leather's
      // legacy shape (it calls `.map` on it internally, even though TS says optional).
      // We want to sign every input in our PSBT, so we pass their indices explicitly.
      const signInputs = Array.from({ length: built.inputCount }, (_, i) => i);
      const signed = await stacksRequest("signPsbt", {
        psbt: built.psbtBase64,
        signInputs,
        broadcast: false,
        network: built.network,
      });
      if (!signed?.psbt) throw new Error("Wallet did not return a signed PSBT.");
      // `@scure/btc-signer` can't auto-finalize our custom CLTV witness script — we do
      // it ourselves: assemble `[signature, witnessScript]` from the wallet's `partialSig`,
      // then broadcast the resulting raw tx via mempool.space (unless the wallet already
      // did, in which case `signed.txid` is set and we just trust it).
      const { rawHex, txid: localTxid } = finalizeCltvSpendPsbt(signed.psbt, lock);
      const txid = signed.txid ?? (await broadcastRawTx(rawHex, built.network)) ?? localTxid;
      updateBtcLock(lock.id, { status: "spent", spendTxid: txid });
      const platformNote =
        built.platformFeeSats > 0 ? `, platform ${built.platformFeeSats}` : "";
      toast({
        title: "Unlocked",
        description: `Swept ${formatBtcFromSats(built.spendAmountSats)} BTC back to your wallet (miner ${built.feeSats} sats${platformNote}).`,
      });
      void refreshBtc();
    } catch (e) {
      const parsed = parseStacksRpcError(e);
      if (parsed.kind === "user-cancel") {
        toast({ title: "Cancelled" });
      } else {
        console.error("unlock failed", e);
        toast({
          title: "Could not unlock",
          description: parsed.kind === "other" ? parsed.description : (e instanceof Error ? e.message : "Spend failed."),
          variant: "destructive",
        });
      }
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <WalletLayout
      mode={isVaultMode ? "btc-vault" : "smart-wallet"}
      vaultMeta={
        isVaultMode && vaultFromRoute
          ? { id: vaultFromRoute.id, name: vaultFromRoute.name, address: vaultFromRoute.derivedVaultAddress }
          : undefined
      }
    >
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="h-7 w-7 text-purple-400" />
            {isVaultMode ? `${vaultFromRoute?.name ?? "Vault"} locks` : "Locks"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isVaultMode
              ? "Lock BTC directly from this vault until a future date."
              : "Lock BTC until a future date. Nobody can move the funds early — not even us."}
          </p>
          {isVaultMode && vaultFromRoute ? (
            <p className="text-xs text-slate-500 font-mono break-all mt-2">
              Vault source: {vaultFromRoute.derivedVaultAddress}
            </p>
          ) : walletId && (
            <p className="text-xs text-slate-500 font-mono break-all mt-2">Smart wallet: {walletId}</p>
          )}
        </div>

        <Tabs defaultValue="btc" className="w-full">
          <TabsList className="bg-slate-800/60 border border-slate-700">
            <TabsTrigger value="btc" className="data-[state=active]:bg-amber-600/20">
              <Bitcoin className="h-4 w-4 mr-2 text-amber-400" />
              Bitcoin
            </TabsTrigger>
            {!isVaultMode && (
            <TabsTrigger value="stx" className="data-[state=active]:bg-violet-600/20">
              <Layers className="h-4 w-4 mr-2 text-violet-400" />
              STX
            </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="btc" className="space-y-6 mt-4">
            <Card className="bg-slate-800/50 border-amber-900/40">
              <Collapsible open={newLockOpen} onOpenChange={setNewLockOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer select-none hover:bg-slate-800/40 rounded-t-lg transition-colors">
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Bitcoin className="h-5 w-5 text-amber-400" />
                      New BTC lock
                      <span className="ml-auto flex items-center gap-2 text-xs text-slate-400 font-normal">
                        {newLockOpen ? "Hide" : "Lock new funds"}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            newLockOpen && "rotate-180"
                          )}
                        />
                      </span>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-5">
                {!isVaultMode && !activeBtcAddress ? (
                  <div className="space-y-3 text-slate-300 text-sm">
                    <p>Connect a Bitcoin wallet to create a lock.</p>
                    <PrimaryButton
                      onClick={() => void connectBtcWallet()}
                      disabled={connecting}
                      className="min-h-10"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Opening wallet…
                        </>
                      ) : (
                        "Connect Bitcoin wallet"
                      )}
                    </PrimaryButton>
                  </div>
                ) : isVaultMode && !vaultFromRoute ? (
                  <p className="text-sm text-slate-400">Vault not found.</p>
                ) : isVaultMode && vaultFromRoute && !vaultFromRoute.witnessScriptHex ? (
                  <p className="text-sm text-slate-400">
                    This vault is legacy preview-only. Create a new vault to lock from vault funds.
                  </p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Locking from</p>
                      <p className="text-sm text-slate-200 font-mono break-all rounded-md bg-slate-900/80 border border-slate-600/60 px-3 py-2">
                        {isVaultMode ? vaultFromRoute?.derivedVaultAddress : activeBtcAddress}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-end justify-between gap-2 flex-wrap">
                        <Label htmlFor="lock-amount" className="text-slate-300 text-sm">
                          Amount to lock
                        </Label>
                        <div className="text-[11px] text-slate-400">
                          Available:{" "}
                          <span className="text-slate-200 tabular-nums">
                            {isVaultMode ? (vaultFunding ? "…" : formatBtcFromSats(availableSats)) : (loadingBalance ? "…" : formatBtcFromSats(availableSats))}
                          </span>{" "}
                          <span className="text-amber-200/70 font-bold text-[10px]">BTC</span>
                          {availableUsd != null && (
                            <span className="text-slate-500"> · ${formatNumber(availableUsd, 2)}</span>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <Input
                          id="lock-amount"
                          type="text"
                          inputMode="decimal"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="bg-slate-900 border-slate-600 text-white h-11 tabular-nums pr-16"
                          placeholder="0.001"
                          autoComplete="off"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-amber-200/80">
                          BTC
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {PERCENT_CHIPS.map((pct) => {
                          const active = percentOfBalance === pct;
                          return (
                            <button
                              key={pct}
                              type="button"
                              disabled={!hasBalance}
                              onClick={() => applyPercent(pct)}
                              className={cn(
                                "px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                                active
                                  ? "bg-amber-600/30 border-amber-600/60 text-amber-100"
                                  : "bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800",
                                !hasBalance && "opacity-40 cursor-not-allowed"
                              )}
                            >
                              {pct === 100 ? "Max" : `${pct}%`}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1">
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          disabled={!hasBalance}
                          value={[percentOfBalance]}
                          onValueChange={(v) => applyPercent(v[0] ?? 0)}
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{percentOfBalance}% of balance</span>
                          <span className="tabular-nums">
                            {amountSats > 0 ? `${amountSats.toLocaleString()} sats` : "—"}
                            {amountUsd != null && (
                              <span className="text-emerald-400 ml-2">≈ ${formatNumber(amountUsd, 2)} USD</span>
                            )}
                          </span>
                        </div>
                        {exceedsBalance && (
                          <p className="text-[11px] text-red-300">Amount exceeds your available balance.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lock-unlock-at" className="text-slate-300 text-sm">
                        Unlock at
                      </Label>
                      <UnlockDateTimePicker
                        id="lock-unlock-at"
                        value={unlockAt}
                        onChange={setUnlockAt}
                        minDate={new Date(Date.now() + 60 * 60 * 1000)}
                        minuteStep={5}
                      />
                      <p className="text-[11px] text-slate-500">
                        {unlockComposed
                          ? `Unlocks ${formatDate(unlockComposed, "PPpp")}`
                          : "Pick a date and time."}
                        {!unlockInFuture && unlockComposed && (
                          <span className="text-red-300"> · must be at least an hour from now</span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lock-note" className="text-slate-300 text-sm">
                        Note (optional)
                      </Label>
                      <Input
                        id="lock-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white h-11"
                        placeholder="e.g. rent reserve, quarterly fund"
                      />
                    </div>

                    {amountSats > 0 && (
                      <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Locking</span>
                          <span className="tabular-nums">
                            {formatBtcFromSats(amountSats)} BTC
                            {amountUsd != null && (
                              <span className="text-slate-500"> · ${formatNumber(amountUsd, 2)}</span>
                            )}
                          </span>
                        </div>
                        {platformFeeQuote.enabled ? (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>
                              Platform fee ({formatFeeBps(platformFeeQuote.bps)})
                            </span>
                            <span className="tabular-nums">
                              {platformFeeQuote.feeSats.toLocaleString()} sats
                              {platformFeeUsd != null && (
                                <span className="text-slate-500"> · ${formatNumber(platformFeeUsd, 2)}</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Platform fee</span>
                            <span>None</span>
                          </div>
                        )}
                        <div className="h-px bg-slate-700/60 my-1" />
                        <div className="flex items-center justify-between text-slate-200 font-medium">
                          <span>Total outgoing</span>
                          <span className="tabular-nums">
                            {formatBtcFromSats(totalSpendSats)} BTC
                          </span>
                        </div>
                        {exceedsBalanceWithFee && (
                          <p className="text-[11px] text-red-300">
                            Total exceeds your balance.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-slate-500">
                      {feerate
                        ? `Fee intel: ~${feerate} sat/vB (${feePresetLabel("halfHour")}). Wallet picks the final miner fee.`
                        : "Fee intel loading…"}
                    </div>

                    <div className="rounded-md border border-emerald-900/40 bg-emerald-950/20 p-3 text-[12px] text-emerald-100/90 leading-relaxed">
                      Funds lock on-chain until the unlock date. Only your wallet can release them, and
                      nobody — including this app — can move them early.
                    </div>

                    {PLATFORM_FEE_CONFIG.treasuryBtc[networkForFee] && PLATFORM_FEE_CONFIG.bps > 0 && (
                      <p className="text-[11px] text-slate-500">
                        A {formatFeeBps(PLATFORM_FEE_CONFIG.bps)} platform fee supports smart-wallet
                        infra. For lock flows, it is collected when you unlock/sweep.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <PrimaryButton
                        onClick={() => void handleCreateLock()}
                        disabled={!canSubmit}
                        className="min-h-10 min-w-[10rem]"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {isVaultMode ? "Sign vault tx…" : "Confirm in wallet…"}
                          </>
                        ) : (
                          isVaultMode ? "Lock from vault" : "Lock BTC"
                        )}
                      </PrimaryButton>
                    </div>
                  </>
                )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-purple-400" />
                  Your BTC locks
                  <span className="text-xs text-slate-500 font-normal">({myLocks.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myLocks.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No locks yet. Create one above — you’ll see funding status and explorer links here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myLocks.map((lock) => (
                      <LockRow
                        key={lock.id}
                        lock={lock}
                        now={now}
                        btcUsd={btcUsd}
                        unlocking={unlockingId === lock.id}
                        onUnlock={handleUnlock}
                        onChainState={onChainByLockId[lock.id]}
                        onCopied={(label) => toast({ title: label })}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {!isVaultMode && (
          <TabsContent value="stx" className="mt-4">
            <Card className="bg-slate-800/50 border-violet-900/30">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Construction className="h-5 w-5 text-violet-400" />
                  STX locks — coming soon
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 text-sm space-y-3">
                <p>
                  Locks and release rules through your Stacks smart wallet. Multisig thresholds and programmable conditions
                  land alongside the on-chain vault contracts.
                </p>
                {walletId && (
                  <Link
                    to={`/dashboard/${walletId}`}
                    className="text-purple-400 text-sm inline-block pt-1 hover:underline"
                  >
                    Back to dashboard
                  </Link>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </WalletLayout>
  );
};

export default Locks;
