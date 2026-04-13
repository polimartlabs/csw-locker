import { useParams, useSearchParams } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { useSelectedWallet } from "@/hooks/useSelectedWallet";
import UnifiedHeader from "./UnifiedHeader";

import DesktopSidebar from "./DesktopSidebar";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import useGetRates from "@/hooks/useGetRates";
import { formatNumber } from "@/utils/numbers";
import { getClientConfig } from "@/utils/chain-config";

interface WalletLayoutProps {
   children: ReactNode;
}

const WalletLayout = ({ children }: WalletLayoutProps) => {
   const { walletId } = useParams();
   const { selectedWallet } = useSelectedWallet();
   const { stxBalance, loading, error } = useAccountBalanceService(walletId)
   const { rates: stxRate, loading: loadingStxRate } = useGetRates(".stx")


   const currentWallet = {
      name: selectedWallet?.name,
      contractId: selectedWallet?.contractId,
      balance: stxBalance ? `${Number(formatNumber(+stxBalance?.balance, stxBalance?.decimal)).toFixed(4) ?? '0.0000'}` : "0.0000",
      usdValue: stxBalance && stxRate ? `$${formatNumber(+stxBalance?.balance * +stxRate?.usdPrice, 2)}` : "..."
   };
   const selectedNetwork = getClientConfig(walletId)?.network

   return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
         <UnifiedHeader
            variant="wallet-management"
            currentWallet={currentWallet}
            selectedNetwork={selectedNetwork}
         />

         <div className="container mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-4 gap-8">
               <DesktopSidebar
                  currentWallet={currentWallet}
                  walletId={walletId}
               />

               {/* Main Content */}
               <div className="lg:col-span-3">{children}</div>
            </div>
         </div>
      </div>
   );
};

export default WalletLayout;
