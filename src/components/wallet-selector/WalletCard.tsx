import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Settings, CopyIcon } from "lucide-react";
import GreenButton from "../ui/green-button";
import { SmartWallet } from "@/services/interfaces";
import { useState } from "react";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { useSelectedWallet } from "@/hooks/useSelectedWallet";

interface WalletCardProps {
  wallet: SmartWallet;
}

const WalletCard = ({ wallet }: WalletCardProps) => {
  // Use "demo" as the wallet ID for demo wallets to enable special routing
  const [copied, setCopied] = useState(false);
  const { stxBalance, sBtcBalance } = useAccountBalanceService(
    wallet.contractId
  );
  const { updateSelectedWallet } = useSelectedWallet();
  const navigate = useNavigate();

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.contractId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenWallet = () => {
    updateSelectedWallet({
      ...wallet,
    });
    navigate(`/dashboard/${wallet.contractId}`);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-600/50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-purple-400" />
            {wallet?.label}
            {wallet.ext && (
              <span className="ml-2 px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded">
                Extension
              </span>
            )}
          </CardTitle>

          {!wallet.ext && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              asChild
            >
              <Link to={`/wallet-details/${wallet.contractId}`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-slate-400 text-sm">Contract Id</div>
          <div className="flex gap-5 items-center">
            <div className="text-white font-mono text-sm">
              {wallet.contractId.slice(0, 5)}...
              {wallet.contractId.slice(
                wallet.contractId.length - 15,
                wallet.contractId.length
              )}
            </div>
            <Button
              size="sm"
              onClick={handleCopy}
              className={copied ? "text-green-500" : "text-muted-foreground"}
            >
              <CopyIcon />
            </Button>
          </div>
        </div>

        <div className="flex flex-between gap-5">
          <div>
            <div className="text-slate-400 text-sm">STX Balance</div>
            <div className="text-white font-semibold">
              {stxBalance?.balance ?? "0.000"}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm">sBTC Balance</div>
            <div className="text-white font-semibold">
              {sBtcBalance?.balance ?? "0.0000"}
            </div>
          </div>
        </div>

        {wallet.extensions && wallet.extensions.length > 0 && (
          <div>
            <div className="text-slate-400 text-sm">Extensions</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {wallet.extensions.map((extension, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded"
                >
                  {extension}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-slate-400 text-sm">Created</div>
          <div className="text-white font-semibold">{wallet.createdAt}</div>
        </div>

        {!wallet.ext && (
          <div className="pt-4">
            <GreenButton className="w-full" onClick={handleOpenWallet}>
              Open Wallet
            </GreenButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletCard;
