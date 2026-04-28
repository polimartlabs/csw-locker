import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bitcoin, CopyIcon, Eye, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BtcVaultRecord, getVaultKind, vaultIsOnChain } from "@/lib/btcVaultStorage";
import { getAddressBalanceSats } from "@/services/btcMempoolService";
import { formatBtcFromSats } from "@/utils/numbers";

type BtcVaultCardProps = {
  vault: BtcVaultRecord;
};

const BtcVaultCard = ({ vault }: BtcVaultCardProps) => {
  const [copied, setCopied] = useState(false);
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const navigate = useNavigate();
  const onChain = vaultIsOnChain(vault);
  const kind = getVaultKind(vault);
  const thresholdNum = parseInt(vault.threshold || "0", 10) || 0;
  const signerCount = vault.signerPubkeys?.length ?? 0;

  const handleCopy = () => {
    void navigator.clipboard.writeText(vault.derivedVaultAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const balance = await getAddressBalanceSats(vault.derivedVaultAddress);
      if (!cancelled) setBalanceSats(balance);
    })();
    return () => {
      cancelled = true;
    };
  }, [vault.id, vault.derivedVaultAddress]);

  return (
    <Card className="bg-slate-800/50 border-amber-900/40 hover:border-amber-600/40 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-white flex items-center flex-wrap gap-2">
            <Bitcoin className="h-5 w-5 text-amber-400 shrink-0" />
            <span>{vault.name}</span>
            <span className="px-2 py-0.5 bg-amber-600/20 text-amber-200 text-xs rounded font-normal">BTC vault</span>
            {onChain && kind === "solo" && (
              <span className="px-2 py-0.5 bg-emerald-600/20 text-emerald-200 text-xs rounded font-normal inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                Personal
              </span>
            )}
            {onChain && kind === "multisig" && signerCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-600/20 text-purple-200 text-xs rounded font-normal inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {thresholdNum} of {signerCount}
              </span>
            )}
            {!onChain && (
              <span className="px-2 py-0.5 bg-slate-600/40 text-slate-300 text-xs rounded font-normal">Legacy</span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-slate-400 text-sm">Deposit address</div>
          {!onChain && (
            <p className="text-xs text-slate-500 mt-0.5 mb-1">
              Preview only — open the vault to delete and re-create it.
            </p>
          )}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="text-white font-mono text-sm break-all">
              {vault.derivedVaultAddress.slice(0, 10)}…{vault.derivedVaultAddress.slice(-10)}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className={copied ? "text-green-500 shrink-0" : "text-muted-foreground shrink-0"}
              aria-label="Copy deposit address"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <div className="text-slate-400 text-sm">Balance</div>
          <div className="text-white text-sm">
            {balanceSats == null ? "Loading…" : `${formatBtcFromSats(balanceSats)} BTC`}
          </div>
        </div>

        <div>
          <div className="text-slate-400 text-sm">Created</div>
          <div className="text-white text-sm">{vault.createdAt.slice(0, 10)}</div>
        </div>

        <Button
          type="button"
          className="w-full"
          variant="secondary"
          onClick={() => navigate(`/dashboard/${vault.id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View vault
        </Button>
      </CardContent>
    </Card>
  );
};

export default BtcVaultCard;
