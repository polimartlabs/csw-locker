import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bitcoin,
  Users,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  User as UserIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useBtcWallet } from "@/contexts/BtcWalletContext";
import { useWalletContext } from "@/contexts/WalletContext";
import {
  createBtcVaultRecord,
  createSoloBtcVaultRecord,
  loadBtcVaults,
} from "@/lib/btcVaultStorage";
import {
  parsePubkey,
  deriveMultisigP2wshVault,
  deriveSoloP2wshVault,
  btcNetworkFromAddress,
  networkLabelFromAddress,
} from "@/lib/btcScript";
import { resolveOwnerPubkey } from "@/lib/btcOwnerPubkey";
import { fetchPubkeyForAddress } from "@/services/btcMempoolService";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import { PLATFORM_FEE_CONFIG } from "@/lib/platformFee";
import { request as stacksRequest } from "@stacks/connect";
import { getClientConfig } from "@/utils/chain-config";

type VaultKind = "solo" | "multisig";

type SignerResolveStatus = "idle" | "resolving" | "resolved" | "error";
type Signer = {
  identifier: string;
  pubkey: string;
  label: string;
  status: SignerResolveStatus;
  error?: string;
};

const PUBKEY_HEX_RE = /^(02|03)[0-9a-fA-F]{64}$/;
const ADDRESS_RE = /^([13mn2]|bc1|tb1|bcrt1)[0-9a-zA-HJ-NP-Z]{8,}$/;
const FREE_VAULT_COUNT = 2;
const USTX_PER_STX = 1_000_000;
type PaymentRail = "stacks-stx" | "bitcoin-btc";

function getVaultCreationFeeUsd(kind: VaultKind, threshold: number): number {
  if (kind === "solo") return 1.2;
  return Math.min(3, 1.2 + Math.max(0, threshold - 1) * 0.6);
}

function detectKind(raw: string): "pubkey" | "address" | "unknown" {
  const v = raw.trim();
  if (!v) return "unknown";
  if (PUBKEY_HEX_RE.test(v)) return "pubkey";
  if (ADDRESS_RE.test(v.toLowerCase())) return "address";
  return "unknown";
}

const CreateBtcVault = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeBtcAddress, connectBtcWallet, connecting } = useBtcWallet();
  const { walletData } = useWalletContext();
  const { stxUsd, btcUsd } = useAssetPrices();

  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<VaultKind>("solo");
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(2);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [ownerPubkeyHex, setOwnerPubkeyHex] = useState<string | null>(null);
  const [loadingOwnerPk, setLoadingOwnerPk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>("stacks-stx");
  const [vaultId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `csw-btc-vault-${Date.now()}`
  );

  // Resolve connected wallet's pubkey exactly once per address. Avoids an infinite
  // loop of wallet prompts when the user edits signers.
  const ownerFetchedForRef = useRef<string | null>(null);
  const walletDataRef = useRef(walletData);
  walletDataRef.current = walletData;

  useEffect(() => {
    if (!activeBtcAddress) return;
    if (ownerFetchedForRef.current === activeBtcAddress) return;
    ownerFetchedForRef.current = activeBtcAddress;
    let cancelled = false;
    setLoadingOwnerPk(true);
    void resolveOwnerPubkey(walletDataRef.current, activeBtcAddress, {
      allowWalletRpc: true,
    })
      .then(({ publicKeyHex }) => {
        if (cancelled) return;
        const lower = publicKeyHex.toLowerCase();
        setOwnerPubkeyHex(lower);
        setSigners((prev) => {
          if (prev.some((s) => s.pubkey.toLowerCase() === lower)) return prev;
          return [
            { identifier: activeBtcAddress, pubkey: lower, label: "You", status: "resolved" },
            ...prev,
          ];
        });
      })
      .catch(() => {
        ownerFetchedForRef.current = null;
      })
      .finally(() => {
        if (!cancelled) setLoadingOwnerPk(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBtcAddress]);

  const networkLabel = activeBtcAddress ? networkLabelFromAddress(activeBtcAddress) : null;
  const soloNonceCommitmentHex = useMemo(
    () => vaultId.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64),
    [vaultId]
  );

  // Derived preview (for the Review step)
  const derivedPreview = useMemo(() => {
    if (!activeBtcAddress) return null;
    try {
      const network = btcNetworkFromAddress(activeBtcAddress);
      if (kind === "solo") {
        if (!ownerPubkeyHex) return null;
        const d = deriveSoloP2wshVault(
          parsePubkey(ownerPubkeyHex),
          network,
          soloNonceCommitmentHex
        );
        return { address: d.address, signerCount: 1 };
      }
      if (signers.length === 0 || !signers.every((s) => s.status === "resolved" && s.pubkey)) return null;
      if (threshold < 1 || threshold > signers.length) return null;
      const pubs = signers.map((s) => parsePubkey(s.pubkey));
      const d = deriveMultisigP2wshVault(pubs, threshold, network);
      return { address: d.address, signerCount: signers.length };
    } catch {
      return null;
    }
  }, [kind, signers, threshold, activeBtcAddress, ownerPubkeyHex, soloNonceCommitmentHex]);

  const addSigner = () =>
    setSigners((prev) => [...prev, { identifier: "", pubkey: "", label: "", status: "idle" }]);
  const removeSigner = (idx: number) => setSigners((prev) => prev.filter((_, i) => i !== idx));
  const updateSigner = (idx: number, patch: Partial<Signer>) =>
    setSigners((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const resolveSignerRow = async (idx: number) => {
    const current = signers[idx];
    if (!current) return;
    const raw = current.identifier.trim();
    if (!raw) {
      updateSigner(idx, { pubkey: "", status: "idle", error: undefined });
      return;
    }
    const k = detectKind(raw);
    if (k === "pubkey") {
      updateSigner(idx, { pubkey: raw.toLowerCase(), status: "resolved", error: undefined });
      return;
    }
    if (k === "unknown") {
      updateSigner(idx, {
        pubkey: "",
        status: "error",
        error: "Paste a Bitcoin address or a public key (66 hex chars starting with 02/03).",
      });
      return;
    }
    updateSigner(idx, { status: "resolving", error: undefined, pubkey: "" });
    const pk = await fetchPubkeyForAddress(raw.toLowerCase());
    if (!pk) {
      updateSigner(idx, {
        status: "error",
        error:
          "Couldn't find a public key for this address. They need to have sent at least one transaction — or paste their public key instead.",
      });
      return;
    }
    updateSigner(idx, { pubkey: pk, status: "resolved", error: undefined });
  };

  // Steps vary by kind
  const stepTitles = useMemo(() => {
    if (kind === "solo") return ["Name & type", "Review"];
    return ["Name & type", "Co-signers", "Review"];
  }, [kind]);
  const lastStep = stepTitles.length - 1;

  const step0Valid = Boolean(name.trim() && activeBtcAddress) && (kind === "solo" ? Boolean(ownerPubkeyHex) : true);
  const multiSignersValid =
    kind === "multisig" &&
    signers.length >= 2 &&
    signers.every((s) => s.status === "resolved" && PUBKEY_HEX_RE.test(s.pubkey)) &&
    threshold >= 1 &&
    threshold <= signers.length;

  const canFinish =
    step0Valid &&
    (kind === "solo" ? Boolean(ownerPubkeyHex) : multiSignersValid) &&
    Boolean(derivedPreview);

  const existingVaultCount = useMemo(() => loadBtcVaults().length, []);
  const needsPaidTier = existingVaultCount >= FREE_VAULT_COUNT;
  const creationFeeUsd = useMemo(
    () => (needsPaidTier ? getVaultCreationFeeUsd(kind, threshold) : 0),
    [needsPaidTier, kind, threshold]
  );
  const treasuryStx = PLATFORM_FEE_CONFIG.treasuryStx;
  const treasuryBtc = networkLabel ? PLATFORM_FEE_CONFIG.treasuryBtc[networkLabel] : null;
  const stxSenderAddress = walletData?.addresses?.stx?.[0]?.address ?? null;
  const creationFeeStx = stxUsd ? creationFeeUsd / stxUsd : null;
  const creationFeeUstx = creationFeeStx ? Math.max(1, Math.ceil(creationFeeStx * USTX_PER_STX)) : null;
  const creationFeeBtc = btcUsd ? creationFeeUsd / btcUsd : null;
  const creationFeeSats = creationFeeBtc ? Math.max(1, Math.ceil(creationFeeBtc * 1e8)) : null;

  const handleFinish = async () => {
    if (!canFinish || !activeBtcAddress) return;
    setSubmitting(true);
    try {
      if (needsPaidTier) {
        if (paymentRail === "stacks-stx") {
          if (!treasuryStx) {
            throw new Error("Stacks fee treasury is not configured.");
          }
          if (!stxSenderAddress) {
            throw new Error("Connect your STX wallet before paying the vault creation fee.");
          }
          if (!creationFeeUstx) {
            throw new Error("STX price unavailable. Try again in a moment.");
          }
          const network = getClientConfig(stxSenderAddress).network;
          toast({
            title: "Approve STX fee payment",
            description: `Pay ${(creationFeeUstx / USTX_PER_STX).toFixed(6)} STX to continue creating this vault.`,
          });
          const feeTx = await stacksRequest("stx_transferStx", {
            recipient: treasuryStx,
            amount: creationFeeUstx,
            network,
            memo: `vault-fee:${kind}:${vaultId.slice(0, 8)}`,
          });
          if (!feeTx?.txid) throw new Error("Fee payment did not return a transaction id.");
        } else {
          if (!treasuryBtc) {
            throw new Error("Bitcoin fee treasury is not configured for this network.");
          }
          if (!activeBtcAddress) {
            throw new Error("Connect your Bitcoin wallet before paying the vault creation fee.");
          }
          if (!creationFeeSats) {
            throw new Error("BTC price unavailable. Try again in a moment.");
          }
          const network = getClientConfig(activeBtcAddress).network;
          toast({
            title: "Approve BTC fee payment",
            description: `Pay ${(creationFeeSats / 1e8).toFixed(8)} BTC to continue creating this vault.`,
          });
          const feeTx = await stacksRequest("sendTransfer", {
            recipients: [{ address: treasuryBtc, amount: creationFeeSats }],
            network,
          });
          if (!feeTx?.txid) throw new Error("BTC fee payment did not return a transaction id.");
        }
      }

      if (kind === "solo") {
        if (!ownerPubkeyHex) throw new Error("Wallet public key not ready yet.");
        createSoloBtcVaultRecord({
          id: vaultId,
          name: name.trim(),
          linkedBtcAddress: activeBtcAddress,
          ownerPubkeyHex,
          ownerLabel: "You",
          nonceCommitmentHex: soloNonceCommitmentHex,
        });
        toast({
          title: "Vault ready",
          description: needsPaidTier
            ? `"${name.trim()}" created after fee payment. Deposit BTC to start using it.`
            : `"${name.trim()}" — deposit BTC to start using it.`,
        });
      } else {
        createBtcVaultRecord({
          id: vaultId,
          name: name.trim(),
          linkedBtcAddress: activeBtcAddress,
          signerPubkeysHex: signers.map((s) => s.pubkey),
          signerLabels: signers.map((s) => s.label.trim() || ""),
          threshold,
        });
        toast({
          title: "Shared vault ready",
          description: needsPaidTier
            ? `Fee paid. Needs ${threshold} of ${signers.length} signatures to spend.`
            : `Needs ${threshold} of ${signers.length} signatures to spend.`,
        });
      }
      navigate(`/dashboard/${vaultId}`);
    } catch (e) {
      toast({
        title: "Couldn't create vault",
        description: e instanceof Error ? e.message : "Check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-10 max-w-xl">
        <div className="mb-6">
          <Link
            to="/wallet-selector"
            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to wallets
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
          <Bitcoin className="h-8 w-8 text-amber-400" />
          New BTC vault
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          A named on-chain pocket for your BTC. Pick <span className="text-white">Personal</span> for
          just-you access, or <span className="text-white">Shared</span> if spends need multiple approvals.
        </p>

        <div className="flex justify-between text-xs text-slate-500 mb-4">
          {stepTitles.map((t, i) => (
            <span key={t} className={i === step ? "text-amber-400 font-medium" : ""}>
              {i + 1}. {t}
            </span>
          ))}
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">{stepTitles[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300 text-sm">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300">Vault name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="e.g. Savings, Rent, Family fund"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Vault type</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKind("solo")}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-left transition-colors",
                        kind === "solo"
                          ? "border-amber-500/70 bg-amber-950/30"
                          : "border-slate-700 bg-slate-900/40 hover:bg-slate-900/70"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="h-4 w-4 text-amber-400" />
                        <span className="text-white font-medium">Personal</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Just you. One signature to spend.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind("multisig")}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-left transition-colors",
                        kind === "multisig"
                          ? "border-purple-500/70 bg-purple-950/30"
                          : "border-slate-700 bg-slate-900/40 hover:bg-slate-900/70"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span className="text-white font-medium">Shared</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Multiple people. Needs X of Y to spend.
                      </p>
                    </button>
                  </div>
                </div>

                {!activeBtcAddress ? (
                  <div className="rounded-md border border-amber-900/30 bg-amber-950/20 p-3">
                    <p className="text-amber-100/90 text-sm mb-2">
                      Connect a Bitcoin wallet to continue.
                    </p>
                    <Button
                      type="button"
                      onClick={() => void connectBtcWallet()}
                      disabled={connecting}
                      className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500"
                    >
                      {connecting ? "Opening…" : "Connect wallet"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">
                      Connected ({networkLabel})
                    </div>
                    <p className="text-xs font-mono break-all text-slate-400">{activeBtcAddress}</p>
                    {loadingOwnerPk && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Preparing your wallet…
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Multisig-only signer step */}
            {kind === "multisig" && step === 1 && (
              <>
                <p className="text-xs text-slate-400">
                  Add everyone who should approve spends. Paste their Bitcoin address or public key — we
                  fill in the rest.
                </p>

                <div className="space-y-3">
                  {signers.map((s, i) => {
                    const isYou = s.label === "You";
                    const k = detectKind(s.identifier);
                    return (
                      <div key={i} className="rounded-md border border-slate-700 bg-slate-900/40 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-slate-300 text-xs uppercase tracking-wide">
                            Signer {i + 1}
                            {isYou && <span className="ml-2 text-amber-300 normal-case font-normal">(you)</span>}
                          </Label>
                          {signers.length > 1 && !isYou && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-slate-400 hover:text-red-300"
                              onClick={() => removeSigner(i)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <Input
                          value={s.label}
                          onChange={(e) => updateSigner(i, { label: e.target.value })}
                          className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                          placeholder="Name (e.g. Alice, Hardware wallet)"
                          disabled={isYou}
                        />
                        <Input
                          value={s.identifier}
                          onChange={(e) =>
                            updateSigner(i, {
                              identifier: e.target.value.trim(),
                              status: "idle",
                              error: undefined,
                              pubkey: "",
                            })
                          }
                          onBlur={() => void resolveSignerRow(i)}
                          className="bg-slate-950 border-slate-700 text-white font-mono text-[11px] h-9"
                          placeholder="Bitcoin address or public key"
                          disabled={isYou}
                        />
                        {!isYou && (
                          <div className="text-[11px] flex items-center gap-2 flex-wrap min-h-4">
                            {s.status === "resolving" && (
                              <span className="text-slate-400 flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Looking them up…
                              </span>
                            )}
                            {s.status === "resolved" && s.pubkey && (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-300">Ready</span>
                                <span className="text-slate-500 font-mono break-all">
                                  {s.pubkey.slice(0, 8)}…{s.pubkey.slice(-6)}
                                </span>
                              </>
                            )}
                            {s.status === "error" && s.error && (
                              <span className="text-red-300 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{s.error}</span>
                              </span>
                            )}
                            {s.status === "idle" && k === "address" && (
                              <span className="text-slate-500">Tab out to continue.</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSigner}
                    className="border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add signer
                  </Button>
                </div>

                <div className="pt-2 space-y-2">
                  <Label className="text-slate-300">Signatures required to spend</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={Math.max(1, signers.length)}
                      value={threshold}
                      onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value || "1", 10) || 1))}
                      className="bg-slate-950 border-slate-700 text-white w-24"
                    />
                    <span className="text-slate-500 text-xs">
                      of {signers.length} signer{signers.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {threshold > signers.length && (
                    <p className="text-[11px] text-red-300 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Can't need more signatures than you have signers.
                    </p>
                  )}
                </div>

                {derivedPreview && (
                  <div className="rounded-md border border-emerald-900/40 bg-emerald-950/20 p-3 space-y-1">
                    <p className="text-xs text-emerald-200">Deposit address preview</p>
                    <p className="text-xs font-mono break-all text-emerald-100/90">{derivedPreview.address}</p>
                  </div>
                )}
              </>
            )}

            {/* Review step (last) */}
            {step === lastStep && (
              <div className="space-y-3">
                <ul className="list-none space-y-2 p-0 m-0">
                  <li>
                    <span className="text-slate-500">Name:</span>{" "}
                    <span className="text-white">{name || "—"}</span>
                  </li>
                  <li>
                    <span className="text-slate-500">Type:</span>{" "}
                    <span className="text-white">
                      {kind === "solo" ? "Personal (just you)" : `Shared · ${threshold} of ${signers.length}`}
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-500">Network:</span>{" "}
                    <span className="text-white capitalize">{networkLabel ?? "—"}</span>
                  </li>
                  {kind === "multisig" && (
                    <li>
                      <div className="text-slate-500 mb-1">Signers:</div>
                      <ul className="list-none space-y-1 pl-2">
                        {signers.map((s) => (
                          <li key={s.pubkey || s.identifier} className="text-[11px] break-all text-slate-300">
                            <span className="text-amber-200 mr-1">{s.label?.trim() || "Signer"}:</span>
                            <span className="font-mono">
                              {s.pubkey.slice(0, 10)}…{s.pubkey.slice(-6)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  {derivedPreview && (
                    <li>
                      <div className="text-slate-500 mb-1">Deposit address:</div>
                      <p className="text-xs font-mono break-all text-emerald-100/90">{derivedPreview.address}</p>
                    </li>
                  )}
                </ul>
                <p className="text-emerald-200/90 text-xs flex items-center gap-2 pt-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Creating the vault doesn't broadcast anything. You fund it by sending BTC to the deposit address.
                </p>
                {needsPaidTier && (
                  <div className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3 text-xs space-y-1">
                    <p className="text-amber-100 font-medium">Creation fee required before vault is created</p>
                    <p className="text-amber-200/90">
                      Vault #{existingVaultCount + 1}: ${creationFeeUsd.toFixed(2)}{" "}
                      {creationFeeStx != null ? `(~${creationFeeStx.toFixed(6)} STX)` : "(STX quote loading...)"}
                    </p>
                    <div className="pt-1 space-y-1.5">
                      <Label className="text-amber-100">Pay with</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentRail("stacks-stx")}
                          className={cn(
                            "rounded-md border px-2.5 py-2 text-left",
                            paymentRail === "stacks-stx"
                              ? "border-amber-500/70 bg-amber-900/30 text-amber-100"
                              : "border-slate-700 bg-slate-900/50 text-slate-300"
                          )}
                        >
                          <div>Stacks (STX)</div>
                          <div className="text-[11px] text-amber-200/80">
                            {creationFeeStx != null ? `${creationFeeStx.toFixed(6)} STX` : "quote loading..."}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentRail("bitcoin-btc")}
                          className={cn(
                            "rounded-md border px-2.5 py-2 text-left",
                            paymentRail === "bitcoin-btc"
                              ? "border-amber-500/70 bg-amber-900/30 text-amber-100"
                              : "border-slate-700 bg-slate-900/50 text-slate-300"
                          )}
                        >
                          <div>Bitcoin (BTC)</div>
                          <div className="text-[11px] text-amber-200/80">
                            {creationFeeSats != null ? `${(creationFeeSats / 1e8).toFixed(8)} BTC` : "quote loading..."}
                          </div>
                        </button>
                      </div>
                    </div>
                    <p className="text-amber-200/70">You'll approve this payment first, then the vault is created.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-4">
              {step > 0 ? (
                <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <span />
              )}
              {step < lastStep ? (
                <Button
                  type="button"
                  onClick={() => setStep((s) => Math.min(lastStep, s + 1))}
                  disabled={
                    (step === 0 && !step0Valid) ||
                    (kind === "multisig" && step === 1 && !multiSignersValid)
                  }
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={!canFinish || submitting}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      {kind === "solo" ? <UserIcon className="h-4 w-4 mr-1" /> : <Users className="h-4 w-4 mr-1" />}
                      Create vault
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateBtcVault;
