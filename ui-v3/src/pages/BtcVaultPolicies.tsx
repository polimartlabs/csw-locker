import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, User, Users } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getBtcVault, getVaultKind } from "@/lib/btcVaultStorage";

const BtcVaultPolicies = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  const vault = vaultId ? getBtcVault(vaultId) : null;

  if (!vault) return <Navigate to="/wallet-selector" replace />;

  const kind = getVaultKind(vault);
  const thresholdNum = parseInt(vault.threshold || "1", 10) || 1;
  const signerCount = vault.signerPubkeys?.length ?? 0;

  return (
    <WalletLayout
      mode="btc-vault"
      vaultMeta={{ id: vault.id, name: vault.name, address: vault.derivedVaultAddress }}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Vault policies</h1>
          <p className="text-slate-400">Review the Bitcoin script rules that control this vault.</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
              Spending policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Policy type</span>
              <Badge className="bg-slate-700 text-slate-100 border-slate-600">
                {kind === "solo" ? "Solo owner" : "Multisig"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Approval threshold</span>
              <span className="text-white font-medium">
                {kind === "solo" ? "1 of 1" : `${thresholdNum} of ${signerCount}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Script model</span>
              <span className="text-white">P2WSH native witness script</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {kind === "solo" ? <User className="h-5 w-5 text-amber-400" /> : <Users className="h-5 w-5 text-amber-400" />}
              Signers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(vault.signerPubkeys ?? []).map((signer, signerIndex) => (
              <div key={signer} className="rounded-md border border-slate-700 bg-slate-900/40 p-3">
                <p className="text-xs text-slate-400">Signer {signerIndex + 1}</p>
                <p className="font-mono text-xs text-slate-200 break-all">{signer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-amber-950/20 border-amber-900/40">
          <CardContent className="p-4 text-sm text-amber-200/90">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-300" />
              <p>
                This policy view is Bitcoin-native and separate from Stacks smart-wallet contract policies.
                Use <Link to={`/btcvault/${vault.id}/settings`} className="underline ml-1">vault settings</Link> for signer updates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </WalletLayout>
  );
};

export default BtcVaultPolicies;
