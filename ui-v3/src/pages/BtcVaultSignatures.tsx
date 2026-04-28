import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base64 } from "@scure/base";
import { Transaction } from "@scure/btc-signer";
import { request as stacksRequest } from "@stacks/connect";
import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { broadcastRawTx } from "@/services/btcMempoolService";
import {
  exportBtcVaultShareLink,
  getBtcVault,
  importSharedBtcVault,
  coordinationFingerprint,
} from "@/lib/btcVaultStorage";
import { networkLabelFromAddress } from "@/lib/btcScript";
import { useWalletContext } from "@/contexts/WalletContext";

function tryFinalizeHex(psbtBase64: string): string | null {
  try {
    const tx = Transaction.fromPSBT(base64.decode(psbtBase64));
    tx.finalize();
    return tx.extract().hex;
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const BtcVaultSignatures = () => {
  const { vaultId } = useParams<{ vaultId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const vault = vaultId ? getBtcVault(vaultId) : null;
  const [shareLink, setShareLink] = useState("");
  const [psbt, setPsbt] = useState("");
  const [decoded, setDecoded] = useState<{
    inputs: number;
    outputs: number;
    totalOutSats: number;
    minInputSignatures: number;
    vaultInputCount: number;
    signerThreshold: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const { walletData } = useWalletContext();
  const activeNetwork = useMemo(
    () => (vault ? vault.network ?? networkLabelFromAddress(vault.linkedBtcAddress) : "mainnet"),
    [vault]
  );
  const connectedPubkeys = useMemo(
    () =>
      new Set(
        [walletData?.preferredBtc?.publicKey, walletData?.taprootBtc?.publicKey, ...(walletData?.addresses.btc ?? []).map((a) => a.publicKey)]
          .filter(Boolean)
          .map((key) => String(key).toLowerCase().replace(/^0x/, ""))
      ),
    [walletData]
  );

  const signerPubkeys = useMemo(
    () => (vault?.signerPubkeys ?? []).map((key) => key.toLowerCase().replace(/^0x/, "")),
    [vault]
  );
  const canCurrentSignerParticipate =
    signerPubkeys.length === 0 || signerPubkeys.some((key) => connectedPubkeys.has(key));
  const signerCoordinationCode = vault ? coordinationFingerprint(vault).slice(0, 16) : null;

  const decodePsbtMeta = (psbtBase64: string) => {
    const tx = Transaction.fromPSBT(base64.decode(psbtBase64.trim())) as unknown as {
      inputs?: Array<{ partialSig?: unknown[]; witnessUtxo?: { script?: Uint8Array } }>;
      outputs?: Array<{ amount?: bigint | number }>;
    };
    const outputs = tx.outputs ?? [];
    const inputs = tx.inputs ?? [];
    const totalOutSats = outputs.reduce((acc, output) => acc + Number(output.amount ?? 0), 0);
    const minInputSignatures = inputs.reduce((minCount, input) => {
      const partialCount = Array.isArray(input.partialSig) ? input.partialSig.length : 0;
      return Math.min(minCount, partialCount);
    }, Number.POSITIVE_INFINITY);
    const vaultScriptHex = vault?.scriptPubkeyHex?.toLowerCase();
    const vaultInputCount = inputs.filter((input) => {
      const scriptHex = input.witnessUtxo?.script ? bytesToHex(input.witnessUtxo.script).toLowerCase() : "";
      return vaultScriptHex ? scriptHex === vaultScriptHex : false;
    }).length;
    return {
      inputs: inputs.length,
      outputs: outputs.length,
      totalOutSats,
      minInputSignatures: Number.isFinite(minInputSignatures) ? minInputSignatures : 0,
      vaultInputCount,
      signerThreshold: Math.max(1, Number.parseInt(vault?.threshold || "1", 10) || 1),
    };
  };

  const decodePsbt = () => {
    try {
      const meta = decodePsbtMeta(psbt.trim());
      setDecoded(meta);
      if (vault?.scriptPubkeyHex && meta.vaultInputCount === 0) {
        toast({
          title: "PSBT does not match this vault",
          description: "No input spends this vault script. Ask the coordinator for the correct PSBT.",
          variant: "destructive",
        });
      }
    } catch {
      setDecoded(null);
      toast({ title: "Invalid PSBT", description: "Paste a valid base64 PSBT.", variant: "destructive" });
    }
  };

  const signPsbt = async () => {
    if (!canCurrentSignerParticipate) {
      toast({
        title: "Signer mismatch",
        description: "Connected wallet is not one of this vault's signer keys.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const summary = decoded ?? decodePsbtMeta(psbt.trim());
      if (vault?.scriptPubkeyHex && summary.vaultInputCount === 0) {
        throw new Error("PSBT does not include this vault as an input.");
      }
      const signInputs = Array.from({ length: Math.max(1, summary.inputs) }, (_, i) => i);
      const signed = await stacksRequest("signPsbt", {
        psbt: psbt.trim(),
        signInputs,
        broadcast: false,
        network: activeNetwork,
      });
      if (!signed?.psbt) throw new Error("Wallet did not return a signed PSBT.");
      setPsbt(signed.psbt);
      toast({ title: "Signature added", description: "Share this PSBT with the next signer or broadcast it." });
    } catch (error) {
      toast({
        title: "Sign failed",
        description: error instanceof Error ? error.message : "Wallet signature request failed.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const broadcast = async () => {
    setBusy(true);
    try {
      const summary = decoded ?? decodePsbtMeta(psbt.trim());
      if (summary.minInputSignatures < summary.signerThreshold) {
        throw new Error(
          `Not enough signatures yet (${summary.minInputSignatures}/${summary.signerThreshold}). Collect more signer approvals first.`
        );
      }
      const raw = tryFinalizeHex(psbt.trim());
      if (!raw) throw new Error("PSBT is not finalizable yet. Add required signatures first.");
      const txid = await broadcastRawTx(raw, activeNetwork);
      toast({ title: "Broadcasted", description: txid });
    } catch (error) {
      toast({
        title: "Broadcast failed",
        description: error instanceof Error ? error.message : "Could not broadcast transaction.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImportVault = () => {
    try {
      const imported = importSharedBtcVault(shareLink);
      toast({ title: "Vault imported", description: `${imported.name} added to your vault list.` });
      navigate(`/btc-vault/${imported.id}/signatures`);
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Invalid vault link.",
        variant: "destructive",
      });
    }
  };

  return (
    <WalletLayout
      mode="btc-vault"
      vaultMeta={vault ? { id: vault.id, name: vault.name, address: vault.derivedVaultAddress } : undefined}
    >
      <div className="space-y-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Multisig signer collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vault && (
              <div className="text-xs text-slate-300">
                Share link: <span className="font-mono break-all">{exportBtcVaultShareLink(vault)}</span>
              </div>
            )}
            {vault && (
              <div className="text-xs text-slate-400">
                Signer status:{" "}
                <span className={canCurrentSignerParticipate ? "text-emerald-300" : "text-amber-300"}>
                  {canCurrentSignerParticipate ? "connected key matches vault signer set" : "connected key not in signer set"}
                </span>
              </div>
            )}
            {signerCoordinationCode && (
              <div className="text-xs text-slate-400">
                Coordination code: <span className="font-mono text-slate-200">{signerCoordinationCode}</span>
              </div>
            )}
            <Label className="text-slate-300 text-xs">Import shared vault link</Label>
            <Input
              value={shareLink}
              onChange={(event) => setShareLink(event.target.value)}
              className="bg-slate-950 border-slate-700 text-white"
              placeholder="csw-vault://import/..."
            />
            <Button onClick={handleImportVault} className="bg-purple-600 hover:bg-purple-500">
              Import vault
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">PSBT decode, sign, broadcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={psbt}
              onChange={(event) => setPsbt(event.target.value)}
              className="w-full min-h-[9rem] rounded-md bg-slate-950 border border-slate-700 p-3 text-xs font-mono text-slate-100"
              placeholder="Paste base64 PSBT"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-slate-700 text-slate-200" onClick={decodePsbt}>
                Decode preview
              </Button>
              <Button onClick={signPsbt} disabled={busy} className="bg-amber-600 hover:bg-amber-500">
                Sign PSBT
              </Button>
              <Button onClick={broadcast} disabled={busy} className="bg-emerald-600 hover:bg-emerald-500">
                Broadcast if final
              </Button>
            </div>
            {decoded && (
              <div className="text-xs text-slate-300 rounded-md border border-slate-700 bg-slate-900/40 p-3 space-y-1">
                <div>Inputs: {decoded.inputs}</div>
                <div>Outputs: {decoded.outputs}</div>
                <div>Total output amount: {decoded.totalOutSats.toLocaleString()} sats</div>
                <div>Vault inputs detected: {decoded.vaultInputCount}</div>
                <div>
                  Collected signatures: {decoded.minInputSignatures} / required {decoded.signerThreshold}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WalletLayout>
  );
};

export default BtcVaultSignatures;
