import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, FileSignature, Loader2, Send } from "lucide-react";
import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getBtcVault, getVaultKind, vaultIsOnChain } from "@/lib/btcVaultStorage";
import { buildVaultSpendPsbt } from "@/lib/btcVaultSpend";
import { request as stacksRequest, JsonRpcError, JsonRpcErrorCode } from "@stacks/connect";
import { base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";
import { broadcastRawTx, getAddressBalanceSats } from "@/services/btcMempoolService";
import { formatBtcFromSats, formatNumber } from "@/utils/numbers";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import { networkLabelFromAddress } from "@/lib/btcScript";

const SATS_PER_BTC = 1e8;
const P2WPKH_DUST = 294;
const PERCENT_CHIPS = [25, 50, 75, 100] as const;

function tryFinalizeHex(psbtBase64: string): string | null {
  try {
    const tx = Transaction.fromPSBT(base64.decode(psbtBase64));
    tx.finalize();
    return tx.hex;
  } catch {
    return null;
  }
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

const BtcVaultSend = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  const { toast } = useToast();
  const { btcUsd } = useAssetPrices();
  const vault = vaultId ? getBtcVault(vaultId) : null;
  const [recipient, setRecipient] = useState("");
  const [amountBtc, setAmountBtc] = useState("");
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const [psbt, setPsbt] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "building" | "awaiting-sign" | "signing" | "ready" | "broadcasting">("idle");
  const [feeSats, setFeeSats] = useState<number | null>(null);
  const [platformFeeSats, setPlatformFeeSats] = useState<number>(0);
  const [inputCount, setInputCount] = useState<number | null>(null);
  const [signaturesRequired, setSignaturesRequired] = useState<number>(1);
  const [copiedPsbt, setCopiedPsbt] = useState(false);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void getAddressBalanceSats(vault.derivedVaultAddress).then((next) => {
      if (!cancelled) setBalanceSats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [vault]);

  if (!vault) return <Navigate to="/wallet-selector" replace />;
  if (!vaultIsOnChain(vault)) return <Navigate to={`/btc-vault/${vault.id}`} replace />;

  const networkLabel = vault.network ?? networkLabelFromAddress(vault.linkedBtcAddress);
  const amountSats = Math.round((Number.parseFloat(amountBtc) || 0) * SATS_PER_BTC);
  const canBuild = recipient.trim().length > 0 && amountSats >= P2WPKH_DUST && amountSats <= (balanceSats ?? 0);
  const amountUsd = amountSats > 0 && btcUsd ? (amountSats / SATS_PER_BTC) * btcUsd : null;
  const kind = getVaultKind(vault);

  const applyPercent = (pct: number) => {
    const next = Math.floor(((balanceSats ?? 0) * pct) / 100);
    setAmountBtc((next / SATS_PER_BTC).toFixed(8).replace(/0+$/, "").replace(/\.$/, ""));
  };

  const handleBuild = async () => {
    if (!canBuild) return;
    setPhase("building");
    try {
      const built = await buildVaultSpendPsbt({ vault, recipientAddress: recipient, amountSats });
      setPsbt(built.psbtBase64);
      setFeeSats(built.feeSats);
      setPlatformFeeSats(built.platformFeeSats);
      setInputCount(built.inputCount);
      setSignaturesRequired(built.signaturesRequired);
      setPhase("awaiting-sign");
    } catch (error) {
      setPhase("idle");
      toast({ title: "Could not prepare send", description: error instanceof Error ? error.message : "Failed.", variant: "destructive" });
    }
  };

  const handleSign = async () => {
    if (!psbt) return;
    setPhase("signing");
    try {
      const signInputs = Array.from({ length: inputCount ?? 0 }, (_, index) => index);
      const signed = await stacksRequest("signPsbt", { psbt, signInputs, broadcast: false, network: networkLabel });
      if (!signed?.psbt) throw new Error("Wallet returned no signed PSBT.");
      setPsbt(signed.psbt);
      setPhase(tryFinalizeHex(signed.psbt) ? "ready" : "awaiting-sign");
    } catch (error) {
      const parsed = parseRpcError(error);
      setPhase("awaiting-sign");
      toast({ title: parsed.cancel ? "Cancelled" : "Sign failed", description: parsed.cancel ? undefined : parsed.message, variant: parsed.cancel ? undefined : "destructive" });
    }
  };

  const handleBroadcast = async () => {
    if (!psbt) return;
    setPhase("broadcasting");
    try {
      const rawHex = tryFinalizeHex(psbt);
      if (!rawHex) throw new Error("PSBT is not finalizable yet.");
      await broadcastRawTx(rawHex, networkLabel);
      toast({ title: "Sent", description: "Transaction submitted." });
      setPhase("idle");
      setPsbt(null);
      setAmountBtc("");
      setRecipient("");
      const next = await getAddressBalanceSats(vault.derivedVaultAddress);
      setBalanceSats(next);
    } catch (error) {
      setPhase("ready");
      toast({ title: "Broadcast failed", description: error instanceof Error ? error.message : "Failed.", variant: "destructive" });
    }
  };

  return (
    <WalletLayout mode="btc-vault" vaultMeta={{ id: vault.id, name: vault.name, address: vault.derivedVaultAddress }}>
      <div className="space-y-6 max-w-3xl">
        <Link to={`/btc-vault/${vault.id}`} className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300">
          <ArrowLeft className="h-4 w-4" />
          Back to vault
        </Link>
        <Card className="bg-slate-800/50 border-emerald-900/40">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-400" />
              Send BTC from vault
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">Recipient address</Label>
              <Input value={recipient} onChange={(event) => setRecipient(event.target.value)} className="bg-slate-950 border-slate-700 text-white font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">Amount (BTC)</Label>
              <Input value={amountBtc} onChange={(event) => setAmountBtc(event.target.value)} className="bg-slate-950 border-slate-700 text-white" />
              <div className="flex gap-2 flex-wrap">
                {PERCENT_CHIPS.map((pct) => (
                  <button key={pct} type="button" onClick={() => applyPercent(pct)} className="px-2 py-1 text-xs rounded border border-slate-700 bg-slate-900/60 text-slate-300">
                    {pct === 100 ? "Max" : `${pct}%`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">Available: {balanceSats != null ? formatBtcFromSats(balanceSats) : "…"} BTC</p>
              {amountUsd != null && <p className="text-xs text-emerald-400">~ ${formatNumber(amountUsd, 2)} USD</p>}
            </div>
            {phase === "idle" && (
              <Button onClick={() => void handleBuild()} disabled={!canBuild} className="bg-purple-600 hover:bg-purple-500">
                Review and build
              </Button>
            )}
            {phase === "building" && <div className="text-slate-300 text-sm">Preparing…</div>}
            {psbt && phase !== "idle" && (
              <div className="space-y-3 rounded-md border border-slate-700 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-300">Inputs: {inputCount ?? "—"} · Needed signatures: {signaturesRequired}</div>
                <div className="text-xs text-slate-300">Miner fee: {feeSats != null ? `${feeSats.toLocaleString()} sats` : "—"}</div>
                {platformFeeSats > 0 && <div className="text-xs text-slate-300">Platform fee: {platformFeeSats.toLocaleString()} sats</div>}
                {(phase === "awaiting-sign" || phase === "signing") && (
                  <Button onClick={() => void handleSign()} className="bg-amber-600 hover:bg-amber-500" disabled={phase === "signing"}>
                    {phase === "signing" ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Waiting for wallet…</> : <><FileSignature className="h-4 w-4 mr-1" /> Sign PSBT</>}
                  </Button>
                )}
                {(phase === "ready" || phase === "broadcasting") && (
                  <Button onClick={() => void handleBroadcast()} className="bg-emerald-600 hover:bg-emerald-500" disabled={phase === "broadcasting"}>
                    {phase === "broadcasting" ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Broadcasting…</> : "Broadcast"}
                  </Button>
                )}
                {kind === "multisig" && (
                  <div className="space-y-2">
                    <textarea value={psbt} onChange={(event) => setPsbt(event.target.value)} className="w-full min-h-[7rem] rounded-md bg-slate-950 border border-slate-700 p-2 text-[11px] font-mono text-slate-200" />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => {
                        void navigator.clipboard.writeText(psbt);
                        setCopiedPsbt(true);
                        setTimeout(() => setCopiedPsbt(false), 1200);
                      }}
                    >
                      {copiedPsbt ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                      Copy PSBT
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WalletLayout>
  );
};

export default BtcVaultSend;
