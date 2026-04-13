import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, TrendingUp, Activity, DollarSign, Settings } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSelectedWallet } from "@/hooks/useSelectedWallet";
import ActiveExtensions from "@/components/dashboard/ActiveExtensions";
import AssetOverview from "@/components/dashboard/AssetOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import SecondaryButton from "@/components/ui/secondary-button"; // Add this import if not present
import PrimaryButton from "@/components/ui/primary-button";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { useSmartWalletContractService } from "@/hooks/useSmartWalletContractService";
import { formatNumber } from "@/utils/numbers";
import useGetRates from "@/hooks/useGetRates";
import { useEffect, useState } from "react";
import { TransactionDataService } from "@/services/transactionDataService";
import { Skeleton } from "@/components/ui/skeleton";

const service = new TransactionDataService();

const Dashboard = () => {
  const { walletId } = useParams<{ walletId: `${string}.${string}` }>()
  const { selectedWallet: walletData, isLoading } = useSelectedWallet();
  const { stxBalance, nftBalance, ftBalance, loading, error } = useAccountBalanceService(walletId)
  const { extensions, loading: extensionsLoading } = useSmartWalletContractService(walletId?.split('.')[0])
  // Use the useGetRates hook for STX and sBTC rates
  const { rates: stxRates, loading: stxLoading, usdPrice: stxUsdPrice, error: stxError } = useGetRates(".stx")
  const { rates: sbtcRates, loading: sbtcLoading, usdPrice: sbtcUsdPrice, error: sbtcError } = useGetRates("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token")

  // Add state for transaction count
  const [txCount, setTxCount] = useState<number | null>(null);
  const [txCountLoading, setTxCountLoading] = useState(false);

  useEffect(() => {
    if (!walletId) return;

    setTxCountLoading(true);
    service.getTransactionCount(walletId)
      .then(setTxCount)
      .catch((error) => {
        console.error('Error fetching transaction count:', error);
        setTxCount(0);
      })
      .finally(() => setTxCountLoading(false));
  }, [walletId]);

  // Only show error state if wallet is not found after loading
  if (!isLoading && !walletData) {
    return (
      <WalletLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Wallet not found</div>
        </div>
      </WalletLayout>
    );
  }

  // Check if stacking extension is active
  const isStackingActive = walletData?.extensions?.some(ext =>
    ext.toLowerCase().includes('stacking') || ext.toLowerCase().includes('stack')
  );

  const StackSTXButton = () => (
    <PrimaryButton asChild>
      <Link to={`/stacking/${walletId}`}>
        <TrendingUp className="mr-2 h-4 w-4" />
        Stack STX
      </Link>
    </PrimaryButton>
  );

  // Calculate USD value with proper error handling
  const calculateUSDValue = () => {
    if (!stxBalance?.balance || !stxUsdPrice) {
      return 0.00;
    }
    try {
      return +stxBalance.balance * +stxUsdPrice;
    } catch (error) {
      console.error('Error calculating USD value:', error);
      return 0.00;
    }
  };

  const usdValue = calculateUSDValue();

  return (
    <WalletLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400">Manage your smart wallet assets and activities</p>
          </div>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : stxBalance ? (
                  <p>{stxBalance?.balance} STX</p>
                ) : (
                  <p>0.00 STX</p>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {walletId ? `${walletId.slice(0, 4)}...${walletId.slice(walletId.length - 15, walletId.length)}` : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">USD Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {stxLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : usdValue > 0 ? (
                  <p>${formatNumber(usdValue, 2)}</p>
                ) : (
                  <p>$0.00</p>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {stxError ? 'Rate unavailable' : 'Current market value'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Activity</CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {txCountLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  txCount !== null ? txCount : 0
                )}
              </div>
              <p className="text-xs text-slate-400">Total transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SecondaryButton asChild variant={undefined} className="h-20 flex-col">
              <Link to={`/send/${walletId}`}>
                <ArrowUpRight className="h-6 w-6 mb-2" />
                Send
              </Link>
            </SecondaryButton>
            <SecondaryButton asChild variant={undefined} className="h-20 flex-col">
              <Link to={`/receive/${walletId}`}>
                <ArrowUpRight className="h-6 w-6 mb-2 rotate-180" />
                Receive
              </Link>
            </SecondaryButton>
            {isStackingActive && (
              <SecondaryButton asChild variant={undefined} className="h-20 flex-col">
                <Link to={`/stacking/${walletId}`}>
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Stack
                </Link>
              </SecondaryButton>
            )}
            <SecondaryButton asChild variant={undefined} className="h-20 flex-col">
              <Link to={`/history/${walletId}`}>
                <Activity className="h-6 w-6 mb-2" />
                History
              </Link>
            </SecondaryButton>
            <SecondaryButton asChild variant={undefined} className="h-20 flex-col">
              <Link to={`/wallet-details/${walletId}`}>
                <Settings className="h-6 w-6 mb-2" />
                Settings
              </Link>
            </SecondaryButton>
          </CardContent>
        </Card>

        {/* Asset Overview and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssetOverview smartWalletAddress={walletId} walletAddress={walletData?.address || ''} />
          <RecentActivity walletAddress={walletData?.address || ''} smartWalletAddress={walletId} />
        </div>

        {/* Active Extensions Section */}
        {extensions && extensions.length > 0 && (
          <ActiveExtensions extensions={extensions} />
        )}
      </div>
    </WalletLayout>
  );
};

export default Dashboard;
