import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { HeaderAssetBalanceStrip } from "@/components/HeaderAssetBalanceStrip";
import { useBtcWallet } from "@/contexts/BtcWalletContext";
import { formatBtcFromSats, formatNumber } from "@/utils/numbers";

type WalletSelectorHeaderProps = {
  stxBalance: string;
  stxUsd: string;
  stxAddress: string | null;
};

const WalletSelectorHeader = ({ stxBalance, stxUsd, stxAddress }: WalletSelectorHeaderProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<"stx" | "btc" | null>(null);
  const {
    activeBtcAddress,
    balanceSats,
    usdPrice: btcSpotUsd,
    loadingBalance: btcLoading,
    connectBtcWallet,
    connecting: btcConnecting,
    disconnectDedicatedBtc,
    satsBtcAddress,
  } = useBtcWallet();

  const btcBtcStr =
    activeBtcAddress && balanceSats != null ? formatBtcFromSats(balanceSats) : "—";
  const btcUsdStr =
    activeBtcAddress && balanceSats != null && btcSpotUsd != null
      ? `$${formatNumber((balanceSats / 1e8) * btcSpotUsd, 2)}`
      : "—";

  const copyStx = () => {
    if (!stxAddress) return;
    void navigator.clipboard.writeText(stxAddress);
    setCopied("stx");
    toast({ title: "Copied", description: "STX address" });
    setTimeout(() => setCopied(null), 1500);
  };

  const copyBtc = () => {
    if (!activeBtcAddress) return;
    void navigator.clipboard.writeText(activeBtcAddress);
    setCopied("btc");
    toast({ title: "Copied", description: "Bitcoin address" });
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-1.5 shrink-0 min-w-0">
            <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-purple-400 shrink-0" />
            <span className="text-sm sm:text-base font-bold text-white truncate">Smart Wallet</span>
          </Link>
          <HeaderAssetBalanceStrip
            stxBalance={stxBalance}
            stxUsd={stxUsd}
            stxAddress={stxAddress}
            onCopyStx={copyStx}
            copiedStx={copied === "stx"}
            btcBtcDisplay={btcBtcStr}
            btcUsd={btcUsdStr}
            btcAddress={activeBtcAddress}
            onCopyBtc={copyBtc}
            copiedBtc={copied === "btc"}
            btcLoading={btcLoading}
            onConnectBtc={() => void connectBtcWallet()}
            btcConnecting={btcConnecting}
            showBtcAddressRow={Boolean(activeBtcAddress)}
            onUnlinkBtc={satsBtcAddress ? () => disconnectDedicatedBtc() : undefined}
            showUnlink={Boolean(satsBtcAddress)}
          />
        </div>
      </div>
    </header>
  );
};

export default WalletSelectorHeader;
