
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Settings } from "lucide-react";
import GreenButton from "../ui/green-button";
import { SmartWallet } from "@/services/smartWalletContractService";

interface WalletCardProps {
  wallet: SmartWallet;
  isDemoMode: boolean;
}

const WalletCard = ({ wallet, isDemoMode }: WalletCardProps) => {
  // Use "demo" as the wallet ID for demo wallets to enable special routing
  const walletId = wallet.contractId;

  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-600/50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-purple-400" />
            {wallet?.label}
          </CardTitle>

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

        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-slate-400 text-sm">Contract ID</div>
          <div className="text-white font-mono text-sm">{wallet.contractId.slice(0, 5)}...{wallet.contractId.slice(wallet.contractId.length - 15, wallet.contractId.length)}</div>
        </div>

        <div>
          <div className="text-slate-400 text-sm">STX Balance</div>
          <div className="text-white font-semibold">{wallet.stxHolding}</div>
        </div>

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

        <div>
          <div className="text-slate-400 text-sm">Created</div>
          <div className="text-white font-semibold">{wallet.createdAt}</div>
        </div>

        <div className="pt-4">
          <GreenButton asChild className="w-full">
            <Link to={`/dashboard/${walletId}`}>
              Open Wallet
            </Link>
          </GreenButton>
        </div>
      </CardContent >
    </Card >
  );
};

export default WalletCard;
