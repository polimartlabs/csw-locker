import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowUpRight, ArrowDownLeft, TrendingUp, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SecondaryButton from "../ui/secondary-button";
import { useCallback, useEffect, useState } from "react";
import { Transaction, TransactionDataService } from "@/services/transactionDataService";
import { formatAmount } from "@/lib/txFormatUtils";
import { fetchStxUsdPrice } from "@/lib/stxPrice";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentActivityProps {
  walletAddress?: string; // connected wallet
  smartWalletAddress?: string; // smart wallet
}

const transactionService = new TransactionDataService();

const RecentActivity = ({ walletAddress, smartWalletAddress }: RecentActivityProps) => {
  const { id: urlWalletId } = useParams();
  const [activities, setActivities] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stxUsd, setStxUsd] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Determine which address to use
  const addressToUse = smartWalletAddress || walletAddress;

  const fetchTransactions = useCallback(async (currentOffset: number = 0) => {
    if (!addressToUse) {
      console.warn("No wallet address provided to RecentActivity. Nothing to fetch.");
      setActivities([]);
      return;
    }
    setLoading(true);
    setError(null);
    console.log("[RecentActivity] Fetching transactions for address:", addressToUse, "offset:", currentOffset);
    try {
      const transactions = await transactionService.getRecentTransactions(addressToUse, currentOffset);
      console.log("[RecentActivity] Transactions fetched:", transactions);
      if (currentOffset === 0) {
        setActivities(transactions);
      } else {
        setActivities(prev => {
          const newTxs = transactions.filter(tx => !prev.some(existing => existing.id === tx.id));
          return [...prev, ...newTxs];
        });
      }
    } catch (error) {
      setError('Failed to fetch transactions. See console for details.');
      console.error('[RecentActivity] Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [addressToUse]);

  useEffect(() => {
    console.log("[RecentActivity] useEffect triggered. addressToUse:", addressToUse);
    setOffset(0);
    fetchTransactions(0);
    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      fetchTransactions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTransactions, addressToUse]);

  useEffect(() => {
    fetchStxUsdPrice().then(setStxUsd);
  }, []);


  const handleRefresh = async () => {
    setRefreshing(true);
    setOffset(0);
    await fetchTransactions(0);
    setRefreshing(false);
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'sent':
        return ArrowUpRight;
      case 'receive':
        return ArrowDownLeft;
      case 'stacking':
        return TrendingUp;
      default:
        return Activity;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'sent':
        return 'text-red-400';
      case 'receive':
        return 'text-green-400';
      case 'stacking':
        return 'text-purple-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'confirmed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  if (!addressToUse) {
    console.warn("[RecentActivity] No address provided. Nothing to render.");
    return <div className="text-slate-400 p-4">No wallet selected.</div>;
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-medium text-white flex items-center">
          <Activity className="mr-2 h-5 w-5 text-purple-400" />
          Recent Activity {smartWalletAddress ? <span className="ml-2 text-xs text-blue-400">(Smart Wallet)</span> : walletAddress ? <span className="ml-2 text-xs text-green-400">(Connected Wallet)</span> : null}
        </CardTitle>
        <SecondaryButton asChild size="sm">
          <Link to={`/history/${urlWalletId}`}>
            View All
          </Link>
        </SecondaryButton>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-400 mb-2">{error}</div>}
        <div className="space-y-3">
          {loading && activities.length === 0 ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32 mb-1" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))
          ) : (
            activities.slice(0, 5).map((activity) => {
              const Icon = getActivityIcon(activity.action);
              const activityColor = getActivityColor(activity.action);
              const statusColor = getStatusColor(activity.status);
              return (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full bg-slate-600/50 flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${activityColor}`} />
                    </div>
                    <div>
                      <div className="text-white font-medium capitalize">
                        {activity.action} {activity.asset}
                      </div>
                      <div className="text-slate-400 text-sm">{activity.timestamp}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${activityColor}`}>
                      {activity.action === 'sent' ? '-' : '+'}{formatAmount(activity.amount, 6)} {activity.asset}
                      {activity.asset === 'STX' && stxUsd && (
                        <span className="text-xs text-slate-400 ml-2">
                          (${((Number(activity.amount) / 1e6) * stxUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD)
                        </span>
                      )}
                    </div>
                    <div className={`text-sm capitalize ${statusColor}`}>
                      {activity.status}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Only show the button if there are more than 5 activities */}
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleRefresh} 
            variant="secondary"
            className="flex items-center justify-center min-w-[90px]"
            disabled={refreshing || loading}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
