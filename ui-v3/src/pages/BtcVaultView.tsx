import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Bitcoin,
  Copy,
  Check,
  Loader2,
  Users,
  User as UserIcon,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Send,
  FileSignature,
  Activity,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  getBtcVault,
  getVaultKind,
  removeBtcVault,
  vaultIsOnChain,
  BTC_VAULTS_CHANGED_EVENT,
  type BtcVaultRecord,
} from "@/lib/btcVaultStorage";
import {
  getAddressBalanceSats,
  broadcastRawTx,
  getAddressTxs,
  getTxFull,
  getTaprootOrdinalInscriptions,
  type OrdinalInscription,
} from "@/services/btcMempoolService";
import { getBitcoinTxExplorerUrl } from "@/services/bitcoinTxService";
import { base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";
import { networkLabelFromAddress } from "@/lib/btcScript";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import { request as stacksRequest, JsonRpcError, JsonRpcErrorCode } from "@stacks/connect";
import { useToast } from "@/hooks/use-toast";
import { formatBtcFromSats, formatNumber } from "@/utils/numbers";
import SecondaryButton from "@/components/ui/secondary-button";
import PrimaryButton from "@/components/ui/primary-button";
import WalletLayout from "@/components/WalletLayout";
import { useBtcWallet } from "@/contexts/BtcWalletContext";

const SATS_PER_BTC = 1e8;
const P2WPKH_DUST = 294;
const PERCENT_CHIPS = [25, 50, 75, 100] as const;

function satsToBtcString(sats: number): string {
  if (sats <= 0) return "";
  return (sats / SATS_PER_BTC).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function parseRpcError(err: unknown): { cancel: boolean; message: string } {
  if (err instanceof JsonRpcError) {
    if (err.code === JsonRpcErrorCode.UserRejection || err.code === JsonRpcErrorCode.UserCanceled) {
      return { cancel: true, message: "Cancelled" };
    }
    return { cancel: false, message: err.message || "Wallet rejected the request." };
  }
  return { cancel: false, message: err instanceof Error ? err.message : "Unknown error." };
}

/** Try to finalize a PSBT and extract its raw hex. Returns null if not yet fully signed. */
function tryFinalizeHex(psbtBase64: string): string | null {
  try {
    const tx = Transaction.fromPSBT(base64.decode(psbtBase64));
    tx.finalize();
    return tx.hex;
  } catch {
    return null;
  }
}

function shortHash(s: string, head = 6, tail = 6): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function formatRelativeShort(unixSec: number, now: number): string {
  const diff = Math.max(0, now - unixSec * 1000);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

const BtcVaultView = () => {
  const navigate = useNavigate();
  const { vaultId, walletId } = useParams<{ vaultId?: string; walletId?: string }>();
  const location = useLocation();
  const effectiveVaultId = vaultId ?? walletId;
  const { toast } = useToast();
  const { btcUsd } = useAssetPrices();
  const { taprootAddress } = useBtcWallet();

  const [vault, setVault] = useState<BtcVaultRecord | null>(() =>
    effectiveVaultId ? getBtcVault(effectiveVaultId) ?? null : null
  );
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedPsbt, setCopiedPsbt] = useState(false);

  /**
   * Vault-scoped activity row. We compute net flow against the vault address from
   * the tx's full vins/vouts so a "spend with change-back" doesn't get mislabeled
   * as a deposit. A row is a deposit IFF the vault address appears in no `vin` and
   * in at least one `vout`. Otherwise it's a spend, and `netVaultDeltaSats` is
   * negative (we display the absolute value).
   */
  type VaultActivityRow = {
    txid: string;
    direction: "in" | "out";
    /** Net sats delta against the vault. Positive for deposits, negative for spends. */
    netVaultDeltaSats: number;
    /** Sats sent to non-vault outputs in a spend (i.e. the actual payment to the recipient). */
    spentToOthersSats: number;
    confirmed: boolean;
    blockTime: number | null;
    feeSats: number;
    vin: Array<{ address: string; value: number }>;
    vout: Array<{ address: string; value: number }>;
  };
  const [recentTxs, setRecentTxs] = useState<VaultActivityRow[] | null>(null);
  const [recentTxsLoading, setRecentTxsLoading] = useState(false);
  const [expandedTxid, setExpandedTxid] = useState<string | null>(null);
  const [ordinalInscriptions, setOrdinalInscriptions] = useState<OrdinalInscription[]>([]);
  const [loadingOrdinals, setLoadingOrdinals] = useState(false);

  const [recipient, setRecipient] = useState("");
  const [amountBtc, setAmountBtc] = useState("");

  // Send flow state machine
  type Phase = "idle" | "building" | "awaiting-sign" | "signing" | "ready" | "broadcasting" | "sent";
  const [phase, setPhase] = useState<Phase>("idle");
  const [psbt, setPsbt] = useState<string | null>(null);
  const [feeSats, setFeeSats] = useState<number | null>(null);
  const [platformFeeSats, setPlatformFeeSats] = useState<number>(0);
  const [inputCount, setInputCount] = useState<number | null>(null);
  const [signaturesRequired, setSignaturesRequired] = useState<number>(1);
  const [broadcastTxid, setBroadcastTxid] = useState<string | null>(null);


  // Sync vault from storage on external changes.
  useEffect(() => {
    if (!effectiveVaultId) return;
    const sync = () => setVault(getBtcVault(effectiveVaultId) ?? null);
    window.addEventListener(BTC_VAULTS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BTC_VAULTS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [effectiveVaultId]);

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    const sectionId = path.includes("/send/")
      ? "vault-send"
      : path.includes("/receive/")
      ? "vault-receive"
      : path.includes("/history/")
      ? "vault-history"
      : (location.hash || "").replace("#", "");
    if (!sectionId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const refreshBalance = useCallback(async () => {
    if (!vault) return;
    setLoadingBalance(true);
    try {
      const b = await getAddressBalanceSats(vault.derivedVaultAddress);
      setBalance(b ?? 0);
    } finally {
      setLoadingBalance(false);
    }
  }, [vault]);

  useEffect(() => {
    if (!vault) return;
    void refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault?.derivedVaultAddress]);

  // Pull recent on-chain activity for this vault address — mirrors the dashboard's
  // "Recent activity" panel, but scoped to the vault's deposit/spend history. We
  // need full tx data (vins + vouts) so we can compute the net delta against the
  // vault address and label each row deterministically:
  //
  //   - "in" (deposit): vault appears in no vin, but in ≥1 vout
  //   - "out" (spend):  vault appears in ≥1 vin (change-back outputs are subtracted
  //                     from the input sum so we report the true amount that left)
  //
  // Capped at 6 rows so this is at most 6 extra `/tx/{txid}` round-trips on mount.
  useEffect(() => {
    if (!vault) return;
    const vaultAddress = vault.derivedVaultAddress;
    const networkLabel2 = vault.network ?? networkLabelFromAddress(vault.linkedBtcAddress);
    let cancelled = false;
    setRecentTxsLoading(true);
    (async () => {
      try {
        const list = await getAddressTxs(vaultAddress);
        const top = list.slice(0, 6);
        const fulls = await Promise.all(top.map((t) => getTxFull(t.txid, networkLabel2)));
        const rows: VaultActivityRow[] = [];
        for (const f of fulls) {
          if (!f) continue;
          const inFromVault = f.vin
            .filter((v) => v.prevout?.scriptpubkey_address === vaultAddress)
            .reduce((acc, v) => acc + (v.prevout?.value ?? 0), 0);
          const outToVault = f.vout
            .filter((o) => o.scriptpubkey_address === vaultAddress)
            .reduce((acc, o) => acc + (o.value ?? 0), 0);
          const outToOthers = f.vout
            .filter((o) => o.scriptpubkey_address !== vaultAddress)
            .reduce((acc, o) => acc + (o.value ?? 0), 0);
          const net = outToVault - inFromVault;
          const direction: "in" | "out" = inFromVault > 0 ? "out" : "in";
          rows.push({
            txid: f.txid,
            direction,
            netVaultDeltaSats: net,
            spentToOthersSats: outToOthers,
            confirmed: Boolean(f.status?.confirmed),
            blockTime: f.status?.block_time ?? null,
            feeSats: f.fee ?? 0,
            vin: (f.vin ?? []).map((v) => ({
              address: v.prevout?.scriptpubkey_address ?? "Unknown",
              value: v.prevout?.value ?? 0,
            })),
            vout: (f.vout ?? []).map((o) => ({
              address: o.scriptpubkey_address ?? "Unknown",
              value: o.value ?? 0,
            })),
          });
        }
        if (!cancelled) setRecentTxs(rows);
      } finally {
        if (!cancelled) setRecentTxsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault?.derivedVaultAddress, vault?.linkedBtcAddress, vault?.network]);

  useEffect(() => {
    if (!taprootAddress) {
      setOrdinalInscriptions([]);
      return;
    }
    let cancelled = false;
    setLoadingOrdinals(true);
    void getTaprootOrdinalInscriptions(taprootAddress)
      .then((rows) => {
        if (!cancelled) setOrdinalInscriptions(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingOrdinals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taprootAddress]);

  const onChain = vault ? vaultIsOnChain(vault) : false;
  const kind = vault ? getVaultKind(vault) : "solo";
  const thresholdNum = vault ? parseInt(vault.threshold || "1", 10) || 1 : 1;
  const signerCount = vault?.signerPubkeys?.length ?? 0;
  const networkLabel = useMemo(
    () => (vault?.network ?? (vault ? networkLabelFromAddress(vault.linkedBtcAddress) : "testnet")),
    [vault]
  );

  const amountSats = Math.round(parseFloat(amountBtc || "0") * SATS_PER_BTC);
  const hasBalance = (balance ?? 0) > 0;
  const amountUsd = amountSats > 0 && btcUsd ? (amountSats / SATS_PER_BTC) * btcUsd : null;
  const balanceUsd = balance != null && btcUsd != null ? (balance / SATS_PER_BTC) * btcUsd : null;
  const canBuild =
    Boolean(vault && onChain) &&
    recipient.trim().length > 0 &&
    amountSats >= P2WPKH_DUST &&
    hasBalance &&
    amountSats <= (balance ?? 0);

  const handleCopy = (text: string, setFlag: (v: boolean) => void) => {
    void navigator.clipboard.writeText(text);
    setFlag(true);
    toast({ title: "Copied" });
    setTimeout(() => setFlag(false), 1500);
  };

  const applyPercent = (pct: number) => {
    if (!hasBalance) return;
    const v = Math.floor(((balance ?? 0) * pct) / 100);
    setAmountBtc(satsToBtcString(Math.max(P2WPKH_DUST, v)));
  };

  const resetFlow = () => {
    setPhase("idle");
    setPsbt(null);
    setFeeSats(null);
    setPlatformFeeSats(0);
    setInputCount(null);
    setBroadcastTxid(null);
  };

  const handleBuild = async () => {
    if (!vault || !canBuild) return;
    setPhase("building");
    try {
      const built = await buildVaultSpendPsbt({
        vault,
        recipientAddress: recipient,
        amountSats,
      });
      setPsbt(built.psbtBase64);
      setFeeSats(built.feeSats);
      setPlatformFeeSats(built.platformFeeSats);
      setInputCount(built.inputCount);
      setSignaturesRequired(built.signaturesRequired);
      setPhase("awaiting-sign");
    } catch (e) {
      toast({
        title: "Couldn't prepare the spend",
        description: e instanceof Error ? e.message : "Try a smaller amount.",
        variant: "destructive",
      });
      setPhase("idle");
    }
  };

  const handleSign = async () => {
    if (!vault || !psbt) return;
    setPhase("signing");
    try {
      // `@stacks/connect` ≥ 8 hard-requires `signInputs` at runtime for Leather's
      // legacy shape — we tell the wallet to sign every input our PSBT has.
      const signInputs = Array.from({ length: inputCount ?? 0 }, (_, i) => i);
      const signed = await stacksRequest("signPsbt", {
        psbt,
        signInputs,
        broadcast: false,
        network: networkLabel,
      });
      if (!signed?.psbt) throw new Error("Wallet returned no signed PSBT.");
      setPsbt(signed.psbt);
      const hex = tryFinalizeHex(signed.psbt);
      setPhase(hex ? "ready" : "awaiting-sign");
      toast({
        title: hex ? "Signed" : "Signature added",
        description: hex
          ? "Ready to broadcast."
          : `Still needs ${Math.max(0, signaturesRequired - 1)} more signature${
              signaturesRequired - 1 === 1 ? "" : "s"
            } — share the PSBT below.`,
      });
    } catch (e) {
      const p = parseRpcError(e);
      setPhase("awaiting-sign");
      toast({
        title: p.cancel ? "Cancelled" : "Couldn't sign",
        description: p.cancel ? undefined : p.message,
        variant: p.cancel ? undefined : "destructive",
      });
    }
  };

  const handleImportPsbt = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    setPsbt(next);
    const hex = tryFinalizeHex(next);
    setPhase(hex ? "ready" : "awaiting-sign");
  };

  const handleBroadcast = async () => {
    if (!vault || !psbt) return;
    setPhase("broadcasting");
    try {
      const hex = tryFinalizeHex(psbt);
      if (!hex) throw new Error("PSBT isn't fully signed yet.");
      const txid = await broadcastRawTx(hex, networkLabel);
      setBroadcastTxid(txid);
      setPhase("sent");
      toast({ title: "Sent", description: `${txid.slice(0, 8)}… submitted to the network.` });
      void refreshBalance();
    } catch (e) {
      const p = parseRpcError(e);
      setPhase("ready");
      toast({ title: "Broadcast failed", description: p.message, variant: "destructive" });
    }
  };

  const startAnother = () => {
    resetFlow();
    setRecipient("");
    setAmountBtc("");
  };

  const handleDeleteUnfundedVault = () => {
    if (!vault) return;
    if ((balance ?? 0) > 0) {
      toast({
        title: "Vault has funds",
        description: "Move funds out before deleting this vault.",
        variant: "destructive",
      });
      return;
    }
    const confirmed = window.confirm(`Delete "${vault.name}"? This removes it from this device.`);
    if (!confirmed) return;
    removeBtcVault(vault.id);
    toast({ title: "Vault deleted" });
    navigate("/wallet-selector");
  };

  const handleDeleteAttempt = () => {
    if (!vault) return;
    if ((balance ?? 0) > 0) {
      const keep = window.confirm(
        `This vault still has ${balance ?? 0} sats. Deleting now can hide funds from your list.\n\nKeep this vault and move funds out first?`
      );
      if (keep) return;
      toast({
        title: "Delete blocked",
        description: "Vaults with funds cannot be deleted. Move funds out first.",
        variant: "destructive",
      });
      return;
    }
    handleDeleteUnfundedVault();
  };


  if (!vault) {
    return (
      <WalletLayout mode="btc-vault">
        <div className="flex items-center justify-center p-4 min-h-[24rem]">
        <Card className="bg-slate-800/50 border-slate-700 max-w-md w-full">
          <CardContent className="p-6 text-center text-slate-300 space-y-4">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
            <p>Vault not found on this device.</p>
            <Link to="/wallet-selector" className="text-purple-400 hover:underline">
              Back to wallets
            </Link>
          </CardContent>
        </Card>
        </div>
      </WalletLayout>
    );
  }

  const explorerAddressUrl = (() => {
    const base = getBitcoinTxExplorerUrl("", vault.linkedBtcAddress).replace("/tx/", "/address/");
    return base + vault.derivedVaultAddress;
  })();

  const typeLabel = kind === "solo" ? "Personal" : `Shared · ${thresholdNum} of ${signerCount}`;
  const typeIcon =
    kind === "solo" ? (
      <UserIcon className="h-4 w-4 text-amber-400" />
    ) : (
      <Users className="h-4 w-4 text-purple-400" />
    );

  const broadcastExplorer = broadcastTxid ? getBitcoinTxExplorerUrl(broadcastTxid, vault.linkedBtcAddress) : null;
  const now = Date.now();
  /**
   * Same visual scaffold as `Dashboard.tsx`:
   *   - 3-card overview grid (Vault balance / Total value / Type)
   *   - Quick actions card
   *   - 2-col grid: Vault asset overview + Recent activity
   *   - Optional signers card for multisig
   *   - Send flow card
   *
   * We deliberately do NOT use `WalletLayout` here because it expects a Stacks `walletId`
   * and would issue a smart-wallet balance request against a vault id. The vault page
   * is its own surface; using the same components and grid keeps the language identical.
   */
  return (
    <WalletLayout
      mode="btc-vault"
      vaultMeta={{ id: vault.id, name: vault.name, address: vault.derivedVaultAddress }}
    >
      <div className="space-y-6 max-w-5xl">
        <Link
          to="/wallet-selector"
          className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to wallets
        </Link>

        <div className="space-y-6">
          {/* Page header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Bitcoin className="h-7 w-7 text-amber-400" />
                {vault.name} dashboard
              </h1>
              <p className="text-slate-400 text-sm">
                Bitcoin vault · {typeLabel.toLowerCase()} · {networkLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-amber-600/20 text-amber-200 rounded inline-flex items-center gap-1">
                {typeIcon}
                {typeLabel}
              </span>
              <span className="px-2 py-1 bg-slate-700 text-slate-200 rounded capitalize">{networkLabel}</span>
              {!onChain && (
                <span className="px-2 py-1 bg-amber-950/60 text-amber-300 border border-amber-900/60 rounded">
                  Legacy
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleDeleteAttempt}
                className="h-7 px-2 text-[11px]"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>

          {/* Legacy banner */}
          {!onChain && (
            <Card className="bg-amber-950/20 border-amber-900/50">
              <CardContent className="p-4 text-amber-100/90 text-sm flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
                <div className="flex-1">
                  <p className="font-medium">This vault was made with an older preview flow.</p>
                  <p className="text-xs text-amber-200/80 mt-1">
                    Its address can't receive real spends. Delete it and make a new one.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="mt-3"
                    onClick={handleDeleteAttempt}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete vault
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stat cards — mirrors Dashboard's three-up grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Vault balance</CardTitle>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {loadingBalance && balance == null ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p>{balance != null ? `${formatBtcFromSats(balance)} BTC` : "—"}</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate" title={vault.derivedVaultAddress}>
                  {shortHash(vault.derivedVaultAddress, 8, 8)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">USD value</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {balanceUsd == null ? <p>—</p> : <p>${formatNumber(balanceUsd, 2)}</p>}
                </div>
                <p className="text-xs text-slate-400">
                  {btcUsd != null ? `BTC @ $${formatNumber(btcUsd, 2)}` : "Spot price loading…"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Policy</CardTitle>
                <ShieldCheck className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {kind === "solo" ? "Solo" : `${thresholdNum} of ${signerCount}`}
                </div>
                <p className="text-xs text-slate-400">
                  {kind === "solo" ? "Single signer" : "Co-signers required"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions — same shape as Dashboard's quick-actions card */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SecondaryButton
                asChild
                variant={undefined}
                className="h-20 flex-col"
                disabled={!onChain}
              >
                <button type="button" onClick={() => navigate(`/btc-vault/${vault.id}/send`)}>
                  <ArrowUpRight className="h-6 w-6 mb-2" />
                  Send
                </button>
              </SecondaryButton>

              <SecondaryButton
                asChild
                variant={undefined}
                className="h-20 flex-col"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/receive/${vault.id}`)}
                >
                  {copiedAddr ? (
                    <Check className="h-6 w-6 mb-2 text-emerald-400" />
                  ) : (
                    <ArrowDownLeft className="h-6 w-6 mb-2" />
                  )}
                  Deposit
                </button>
              </SecondaryButton>

              <SecondaryButton asChild variant={undefined} className="h-20 flex-col">
                <a href={explorerAddressUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-6 w-6 mb-2" />
                  Explorer
                </a>
              </SecondaryButton>

              <PrimaryButton
                onClick={() => void refreshBalance()}
                disabled={loadingBalance}
                className="h-20 flex-col"
              >
                {loadingBalance ? (
                  <Loader2 className="h-6 w-6 mb-2 animate-spin" />
                ) : (
                  <Activity className="h-6 w-6 mb-2" />
                )}
                Refresh
              </PrimaryButton>
            </CardContent>
          </Card>



          {/* Vault asset overview + recent activity grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single-asset overview, styled exactly like AssetOverview rows */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-medium text-white flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-purple-400" />
                  Vault assets
                </CardTitle>
                <div className="text-right">
                  <div className="text-sm text-slate-400">Total value</div>
                  <div className="text-lg font-bold text-green-400">
                    {balanceUsd == null ? "—" : `$${formatNumber(balanceUsd, 2)}`}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Bitcoin className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-medium">BTC</div>
                      <div className="text-slate-400 text-sm">
                        {loadingBalance && balance == null ? (
                          <Skeleton className="h-3 w-24" />
                        ) : (
                          <span className="font-mono text-xs sm:text-sm">
                            {balance != null ? `${formatBtcFromSats(balance)} BTC` : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-white text-sm font-medium">
                      {balanceUsd == null ? (
                        <p className="text-slate-500">—</p>
                      ) : (
                        <p>${formatNumber(balanceUsd, 2)}</p>
                      )}
                    </div>
                    {btcUsd != null && (
                      <div className="text-[10px] text-slate-500">
                        ${formatNumber(btcUsd, 2)} / BTC
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                      {typeIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-medium">Deposit address</div>
                      <div className="text-slate-400 text-xs font-mono truncate" title={vault.derivedVaultAddress}>
                        {shortHash(vault.derivedVaultAddress, 10, 10)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded hover:bg-slate-700"
                    onClick={() => handleCopy(vault.derivedVaultAddress, setCopiedAddr)}
                    aria-label="Copy deposit address"
                  >
                    {copiedAddr ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-300" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="min-w-0">
                    <div className="text-white font-medium">Taproot ordinals</div>
                    <div className="text-slate-400 text-xs">
                      {taprootAddress
                        ? `${taprootAddress.slice(0, 10)}…${taprootAddress.slice(-8)}`
                        : "No taproot address connected"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white font-medium">
                      {loadingOrdinals ? "Loading…" : `${ordinalInscriptions.length} inscriptions`}
                    </div>
                    {ordinalInscriptions[0]?.id && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {ordinalInscriptions[0].id.slice(0, 10)}…
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent activity, scoped to this vault address */}
            <Card id="vault-history" className="bg-slate-800/50 border-slate-700 backdrop-blur-sm scroll-mt-24">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg font-medium text-white flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-purple-400" />
                  Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentTxsLoading && recentTxs == null ? (
                  <>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </>
                ) : recentTxs && recentTxs.length > 0 ? (
                  recentTxs.map((tx) => {
                    const incoming = tx.direction === "in";
                    // For deposits: show the net inflow to the vault. For spends: show the
                    // amount that actually left the vault (input − change), which equals
                    // `outToOthers + miner_fee`. We use the precomputed `netVaultDeltaSats`
                    // for spends (always negative) — a spend's reported magnitude is `-net`.
                    const displayedSats = incoming
                      ? tx.netVaultDeltaSats
                      : Math.abs(tx.netVaultDeltaSats);
                    return (
                      <div
                        key={tx.txid}
                        className="p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
                      >
                        <button
                          type="button"
                          className="w-full text-left flex items-center justify-between"
                          onClick={() => setExpandedTxid((prev) => (prev === tx.txid ? null : tx.txid))}
                        >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              incoming ? "bg-emerald-500/20" : "bg-amber-500/20"
                            }`}
                          >
                            {incoming ? (
                              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium">
                              {incoming ? "Deposit" : "Spend"}
                            </div>
                            <div className="text-slate-400 text-[11px] font-mono truncate">
                              {shortHash(tx.txid)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm tabular-nums font-medium ${
                              incoming ? "text-emerald-300" : "text-amber-300"
                            }`}
                          >
                            {`${incoming ? "+" : "−"}${formatBtcFromSats(displayedSats)} BTC`}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {tx.confirmed && tx.blockTime
                              ? formatRelativeShort(tx.blockTime, now)
                              : "Unconfirmed"}
                          </div>
                        </div>
                        </button>
                        {expandedTxid === tx.txid && (
                          <div className="mt-3 pt-3 border-t border-slate-700 space-y-2 text-xs">
                            <a
                              href={getBitcoinTxExplorerUrl(tx.txid, vault.linkedBtcAddress)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-purple-300 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open on explorer
                            </a>
                            <div className="text-slate-300">Inputs</div>
                            <div className="space-y-1">
                              {tx.vin.map((input, idx) => (
                                <div key={`${tx.txid}-vin-${idx}`} className="flex justify-between gap-2 text-slate-400">
                                  <span className="font-mono truncate">{input.address}</span>
                                  <span className="text-slate-200 tabular-nums">{formatBtcFromSats(input.value)} BTC</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-slate-300 mt-2">Outputs</div>
                            <div className="space-y-1">
                              {tx.vout.map((output, idx) => (
                                <div key={`${tx.txid}-vout-${idx}`} className="flex justify-between gap-2 text-slate-400">
                                  <span className="font-mono truncate">{output.address}</span>
                                  <span className="text-slate-200 tabular-nums">{formatBtcFromSats(output.value)} BTC</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between text-slate-400 pt-1">
                              <span>Miner fee</span>
                              <span className="text-slate-200">{tx.feeSats.toLocaleString()} sats</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">No activity yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Multisig signers */}
          {kind === "multisig" && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  Co-signers · {thresholdNum} of {signerCount} needed
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(vault.signerPubkeys ?? []).map((pk, i) => (
                  <div key={pk} className="rounded-md border border-slate-700 bg-slate-900/40 p-3">
                    <div className="text-xs text-amber-200 mb-1">
                      {vault.signerLabels?.[i]?.trim() || `Signer ${i + 1}`}
                    </div>
                    <div className="font-mono text-[11px] break-all text-slate-300">
                      {shortHash(pk, 14, 8)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Vault send lives on `/btc-vault/:vaultId/send` */}
        </div>
      </div>
    </WalletLayout>
  );
};

export default BtcVaultView;
