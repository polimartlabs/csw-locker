import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getBtcVault,
  getVaultKind,
  rebuildVaultScript,
  updateBtcVault,
  removeBtcVault,
  vaultIsOnChain,
} from "@/lib/btcVaultStorage";
import { getAddressBalanceSats, broadcastRawTx } from "@/services/btcMempoolService";
import { Save, Settings, Users } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { buildVaultShutdownPsbt } from "@/lib/btcVaultSpend";
import { request as stacksRequest, JsonRpcError, JsonRpcErrorCode } from "@stacks/connect";
import { base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";
import { networkLabelFromAddress } from "@/lib/btcScript";

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

const BtcVaultSettings = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const vault = vaultId ? getBtcVault(vaultId) : null;

  const initialLabels = useMemo(() => vault?.signerLabels ?? [], [vault?.id, vault?.signerLabels]);
  const [signerLabels, setSignerLabels] = useState<string[]>(initialLabels);
  const [policy, setPolicy] = useState<"standard" | "timelock">(vault?.policy ?? "standard");
  const [unlockUnixSecInput, setUnlockUnixSecInput] = useState<string>(
    vault?.unlockUnixSec ? String(vault.unlockUnixSec) : ""
  );
  const [thresholdInput, setThresholdInput] = useState<string>(vault?.threshold ?? "1");
  const [spendingPolicyPreset, setSpendingPolicyPreset] = useState<"custom" | "conservative" | "balanced" | "aggressive">("custom");
  const [timelockPreset, setTimelockPreset] = useState<"custom" | "24h" | "7d" | "30d">("custom");
  const [vaultBalanceSats, setVaultBalanceSats] = useState<number | null>(null);
  const [shutdownPhase, setShutdownPhase] = useState<
    "idle" | "building" | "awaiting-sign" | "signing" | "ready" | "broadcasting"
  >("idle");
  const [shutdownPsbt, setShutdownPsbt] = useState<string | null>(null);
  const [shutdownInputCount, setShutdownInputCount] = useState<number | null>(null);
  const [shutdownFeeSats, setShutdownFeeSats] = useState<number | null>(null);
  const [shutdownSweepSats, setShutdownSweepSats] = useState<number | null>(null);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    (async () => {
      const balance = await getAddressBalanceSats(vault.derivedVaultAddress);
      if (!cancelled) setVaultBalanceSats(balance);
    })();
    return () => {
      cancelled = true;
    };
  }, [vault?.id, vault?.derivedVaultAddress]);

  if (!vault) return <Navigate to="/wallet-selector" replace />;

  const kind = getVaultKind(vault);
  const isMultisig = kind === "multisig";
  const hasFunds = (vaultBalanceSats ?? 0) > 0;
  const networkLabel = vault.network ?? networkLabelFromAddress(vault.linkedBtcAddress);

  const setSignerLabel = (index: number, value: string) => {
    const next = [...signerLabels];
    next[index] = value;
    setSignerLabels(next);
  };

  const applyMultisigPolicyPreset = (preset: "conservative" | "balanced" | "aggressive") => {
    const signerCount = Math.max(1, vault.signerPubkeys?.length ?? 1);
    if (preset === "conservative") {
      setThresholdInput(String(signerCount));
    } else if (preset === "balanced") {
      setThresholdInput(String(Math.max(1, Math.ceil(signerCount / 2))));
    } else {
      setThresholdInput("1");
    }
    setSpendingPolicyPreset(preset);
  };

  const applyTimelockPreset = (preset: "24h" | "7d" | "30d") => {
    const nowSec = Math.floor(Date.now() / 1000);
    const offset = preset === "24h" ? 24 * 3600 : preset === "7d" ? 7 * 24 * 3600 : 30 * 24 * 3600;
    setUnlockUnixSecInput(String(nowSec + offset));
    setPolicy("timelock");
    setTimelockPreset(preset);
  };

  const handleSave = () => {
    if (hasFunds) {
      toast({
        title: "Policy update blocked",
        description: "Vault has funds. Empty it first, then update enforceable script policy.",
        variant: "destructive",
      });
      return;
    }
    try {
      const parsedThreshold = isMultisig ? Number.parseInt(thresholdInput || "1", 10) : undefined;
      if (isMultisig && (!Number.isFinite(parsedThreshold) || (parsedThreshold ?? 0) <= 0)) {
        throw new Error("Threshold must be a positive number.");
      }
      const parsedUnlock = !isMultisig && policy === "timelock"
        ? Number.parseInt(unlockUnixSecInput || "0", 10)
        : undefined;
      if (!isMultisig && policy === "timelock" && (!Number.isFinite(parsedUnlock) || (parsedUnlock ?? 0) <= 500_000_000)) {
        throw new Error("Timelock requires a unix timestamp in seconds.");
      }
      const rebuilt = rebuildVaultScript(vault, {
        threshold: parsedThreshold,
        policy: isMultisig ? undefined : policy,
        unlockUnixSec: parsedUnlock,
      });
      updateBtcVault(vault.id, {
        derivedVaultAddress: rebuilt.derivedVaultAddress,
        witnessScriptHex: rebuilt.witnessScriptHex,
        scriptPubkeyHex: rebuilt.scriptPubkeyHex,
        signerPubkeys: rebuilt.signerPubkeys,
        threshold: rebuilt.threshold,
        policy: rebuilt.policy,
        unlockUnixSec: rebuilt.unlockUnixSec,
        signerLabels: signerLabels.map((label, labelIndex) => label?.trim() || `Signer ${labelIndex + 1}`),
      });
    } catch (error) {
      toast({
        title: "Could not update policy",
        description: error instanceof Error ? error.message : "Invalid settings.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Settings saved",
      description: "Vault policy and script settings were updated.",
    });
  };

  const handleStartShutdown = async () => {
    if (!vaultIsOnChain(vault)) return;
    setShutdownPhase("building");
    try {
      const built = await buildVaultShutdownPsbt({
        vault,
        recipientAddress: vault.linkedBtcAddress,
      });
      setShutdownPsbt(built.psbtBase64);
      setShutdownInputCount(built.inputCount);
      setShutdownFeeSats(built.feeSats);
      setShutdownSweepSats(built.sweepAmountSats);
      setShutdownPhase("awaiting-sign");
    } catch (error) {
      setShutdownPhase("idle");
      toast({
        title: "Couldn't prepare shutdown",
        description: error instanceof Error ? error.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const handleSignShutdown = async () => {
    if (!shutdownPsbt) return;
    setShutdownPhase("signing");
    try {
      const signInputs = Array.from({ length: shutdownInputCount ?? 0 }, (_, index) => index);
      const signed = await stacksRequest("signPsbt", {
        psbt: shutdownPsbt,
        signInputs,
        broadcast: false,
        network: networkLabel,
      });
      if (!signed?.psbt) throw new Error("Wallet returned no signed PSBT.");
      setShutdownPsbt(signed.psbt);
      setShutdownPhase(tryFinalizeHex(signed.psbt) ? "ready" : "awaiting-sign");
    } catch (error) {
      const parsed = parseRpcError(error);
      setShutdownPhase("awaiting-sign");
      toast({
        title: parsed.cancel ? "Cancelled" : "Couldn't sign shutdown",
        description: parsed.cancel ? undefined : parsed.message,
        variant: parsed.cancel ? undefined : "destructive",
      });
    }
  };

  const handleBroadcastShutdown = async () => {
    if (!shutdownPsbt) return;
    setShutdownPhase("broadcasting");
    try {
      const raw = tryFinalizeHex(shutdownPsbt);
      if (!raw) throw new Error("Shutdown PSBT isn't fully signed yet.");
      await broadcastRawTx(raw, networkLabel);
      removeBtcVault(vault.id);
      toast({
        title: "Vault shut down",
        description: "Funds were swept back and the vault was removed from your list.",
      });
      navigate("/wallet-selector");
    } catch (error) {
      const parsed = parseRpcError(error);
      setShutdownPhase("ready");
      toast({
        title: "Shutdown broadcast failed",
        description: parsed.message,
        variant: "destructive",
      });
    }
  };

  return (
    <WalletLayout
      mode="btc-vault"
      vaultMeta={{ id: vault.id, name: vault.name, address: vault.derivedVaultAddress }}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Vault settings</h1>
          <p className="text-slate-400">Manage labels and membership details for this vault.</p>
          <p className="text-xs text-slate-500 mt-2">
            Vault balance: {vaultBalanceSats == null ? "…" : `${vaultBalanceSats.toLocaleString()} sats`}
          </p>
        </div>

        {!isMultisig ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-400" />
                Solo vault settings
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              <div className="space-y-3">
                <p>This vault is single-owner. You can apply enforceable script policy here.</p>
                <div className="space-y-2">
                  <Label className="text-slate-300">Policy</Label>
                  <select
                    value={policy}
                    onChange={(event) => setPolicy(event.target.value as "standard" | "timelock")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white"
                  >
                    <option value="standard">Standard spend</option>
                    <option value="timelock">Timelock (CLTV)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Timelock presets</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => applyTimelockPreset("24h")}
                    >
                      24h
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => applyTimelockPreset("7d")}
                    >
                      7d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 text-slate-200"
                      onClick={() => applyTimelockPreset("30d")}
                    >
                      30d
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">Selected preset: {timelockPreset}</p>
                </div>
                {policy === "timelock" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300">Unlock time (Unix seconds)</Label>
                    <Input
                      value={unlockUnixSecInput}
                      onChange={(event) => setUnlockUnixSecInput(event.target.value)}
                      className="bg-slate-950 border-slate-700 text-white"
                      placeholder="e.g. 1780000000"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Multisig members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Threshold (enforceable script setting)</Label>
                <Input
                  value={thresholdInput}
                  onChange={(event) => setThresholdInput(event.target.value)}
                  className="bg-slate-950 border-slate-700 text-white"
                  placeholder={`1-${vault.signerPubkeys?.length ?? 1}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Spending policy presets</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-slate-200"
                    onClick={() => applyMultisigPolicyPreset("conservative")}
                  >
                    Conservative
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-slate-200"
                    onClick={() => applyMultisigPolicyPreset("balanced")}
                  >
                    Balanced
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-slate-200"
                    onClick={() => applyMultisigPolicyPreset("aggressive")}
                  >
                    Aggressive
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">Selected preset: {spendingPolicyPreset}</p>
              </div>
              {(vault.signerPubkeys ?? []).map((signer, signerIndex) => (
                <div key={signer} className="rounded-md border border-slate-700 bg-slate-900/40 p-3 space-y-2">
                  <Label className="text-slate-300">Signer {signerIndex + 1} label</Label>
                  <Input
                    value={signerLabels[signerIndex] ?? ""}
                    onChange={(event) => setSignerLabel(signerIndex, event.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                    placeholder={`Signer ${signerIndex + 1}`}
                  />
                  <p className="font-mono text-xs text-slate-400 break-all">{signer}</p>
                </div>
              ))}

              <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-500">
                <Save className="h-4 w-4 mr-2" />
                Save member labels
              </Button>
            </CardContent>
          </Card>
        )}
        {vaultIsOnChain(vault) && (
          <Card className="bg-slate-800/50 border-red-900/50">
            <CardHeader>
              <CardTitle className="text-white">Shutdown vault</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>
                Sweep all vault funds back to your linked BTC address, then remove this vault from this device.
              </p>
              {shutdownPhase !== "idle" && (
                <div className="rounded-md border border-slate-700 bg-slate-900/50 p-3 space-y-1 text-xs">
                  <div>Inputs: {shutdownInputCount ?? "—"}</div>
                  <div>Sweep amount: {shutdownSweepSats != null ? `${shutdownSweepSats.toLocaleString()} sats` : "—"}</div>
                  <div>Miner fee: {shutdownFeeSats != null ? `${shutdownFeeSats.toLocaleString()} sats` : "—"}</div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {shutdownPhase === "idle" && (
                  <Button onClick={() => void handleStartShutdown()} variant="destructive">
                    Build shutdown transaction
                  </Button>
                )}
                {(shutdownPhase === "awaiting-sign" || shutdownPhase === "signing") && (
                  <Button
                    onClick={() => void handleSignShutdown()}
                    disabled={shutdownPhase === "signing"}
                    className="bg-amber-600 hover:bg-amber-500"
                  >
                    {shutdownPhase === "signing" ? "Waiting for wallet..." : "Sign shutdown"}
                  </Button>
                )}
                {(shutdownPhase === "ready" || shutdownPhase === "broadcasting") && (
                  <Button
                    onClick={() => void handleBroadcastShutdown()}
                    disabled={shutdownPhase === "broadcasting"}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    {shutdownPhase === "broadcasting" ? "Broadcasting..." : "Broadcast shutdown"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WalletLayout>
  );
};

export default BtcVaultSettings;
