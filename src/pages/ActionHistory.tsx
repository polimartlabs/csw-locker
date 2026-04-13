import WalletLayout from "@/components/WalletLayout";
import TransactionItem, { getTxLabel } from "@/components/transactions/TransactionItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PrimaryButton from "@/components/ui/primary-button";
import SecondaryButton from "@/components/ui/secondary-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedWallet } from "@/hooks/useSelectedWallet";
import { useTransactionData } from "@/hooks/useTransactionData";
import { TxInfo } from "@/services/types";
import { Filter, History, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const ActionHistory = () => {
  const { walletId } = useParams<{ walletId: `${string}.${string}` }>();
  const { selectedWallet } = useSelectedWallet();
  const [searchTerm, setSearchTerm] = useState("");
  const [displayCount, setDisplayCount] = useState(5);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);

  // Use the custom hook for transaction data
  const {
    transactions,
    isLoading,
    hasMore,
    refreshing,
    stxUsd,
    assetDecimals,
    transactionStats,
    txActions,
    handleRefresh,
    loadMore,
  } = useTransactionData(walletId || selectedWallet?.address);


  const handleRefreshWithDisplayReset = async () => {
    setDisplayCount(5);
    await handleRefresh();
  };

  const handleClearSearch = () => setSearchTerm("");

  const filteredTransactions = useMemo(() =>
    transactions.filter(tx =>
      (filterAction === "all" || tx.action === filterAction) &&
      (tx.assets[0]?.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.tx?.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [transactions, searchTerm, filterAction]
  );

  const visibleTransactions = filteredTransactions.slice(0, displayCount);

  return (
    <WalletLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Action History</h1>
          <p className="text-slate-400">
            View all your wallet transactions and activities.
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 relative">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-white flex items-center">
                <History className="mr-2 h-5 w-5 text-purple-400" />
                <span className="hidden sm:inline">Transaction History</span>
                <span className="sm:hidden">Transactions</span>
              </CardTitle>

              {/* Mobile: Stack controls vertically, Desktop: Horizontal */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                {/* Active filters display */}
                {(filterAction !== 'all') && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center bg-slate-700 text-white rounded px-2 py-1 text-xs">
                      {getTxLabel({ action: filterAction, assets: [], actor: '', stamp: '', time: '', tx: '', tx_status: 'confirmed' } as TxInfo)}
                      <button onClick={() => setFilterAction('all')} className="ml-1 text-slate-400 hover:text-white focus:outline-none">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                )}

                {/* Search and Filter Row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-80 lg:w-96 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 pr-12 h-9"
                      style={{ paddingRight: searchTerm ? '2.5rem' : undefined }}
                    />
                    {searchTerm && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none z-10"
                        aria-label="Clear search"
                        style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', height: '1.5rem', width: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center justify-center h-9 w-9 bg-slate-700/50 border border-slate-600 rounded hover:bg-slate-700 focus:outline-none"
                      tabIndex={0}
                      onClick={() => setShowFilter((prev) => !prev)}
                    >
                      <Filter className="w-4 h-4 text-slate-400" />
                    </button>
                    {showFilter && (
                      <div
                        className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded shadow-lg z-20 p-4"
                      >
                        <div className="mb-2">
                          <label className="block text-xs text-slate-400 mb-1">Action</label>
                          <Select value={filterAction} onValueChange={e => {
                            setShowFilter(false);
                            setFilterAction(e)
                          }} defaultOpen>
                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600 text-white shadow-lg">
                              <SelectItem value="all" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">All</SelectItem>
                              {txActions.map(action => (
                                <SelectItem key={action} value={action} className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">{getTxLabel({ action, assets: [], actor: '', stamp: '', time: '', tx: '', tx_status: 'confirmed' } as TxInfo)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  <PrimaryButton
                    onClick={handleRefreshWithDisplayReset}
                    className="flex items-center justify-center h-9 min-w-[80px] sm:min-w-[90px] px-2 sm:px-3"
                    disabled={refreshing || isLoading}
                  >
                    {refreshing ? <Loader2 className="mr-1 sm:mr-2 h-4 w-4 animate-spin" /> : null}
                    <span className="hidden sm:inline">Refresh</span>
                    <span className="sm:hidden">↻</span>
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-20">
            <div
              style={{ maxHeight: '420px', overflowY: 'auto' }}
              className="custom-scrollbar"
            >
              {isLoading && transactions.length === 0 ? (
                <div className="flex flex-col gap-3 max-h-auto py-8">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-48 mb-1" />
                          <Skeleton className="h-2 w-40" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visibleTransactions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-400">No transactions found</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleTransactions.map((tx) => (
                    <TransactionItem
                      key={tx.tx}
                      tx={tx}
                      stxUsd={stxUsd}
                      walletId={walletId}
                      assetDecimals={assetDecimals}
                      showFullDetails={true}
                    />
                  ))}
                </div>
              )}
            </div>
            <style>{`
              
            `}</style>
            <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-20">
              <SecondaryButton
                onClick={() => {
                  if (displayCount >= filteredTransactions.length && hasMore) {
                    loadMore();
                  } else {
                    setDisplayCount(displayCount + 5);
                  }
                }}
                disabled={isLoading || (!hasMore && displayCount >= filteredTransactions.length)}
                className="min-w-[140px] sm:min-w-[180px] text-xs sm:text-sm px-3 sm:px-4 py-2"
              >
                {isLoading ? <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : null}
                <span className="hidden sm:inline">
                  {!hasMore && displayCount >= filteredTransactions.length ? 'All Transactions Loaded' : 'Load More Transactions'}
                </span>
                <span className="sm:hidden">
                  {!hasMore && displayCount >= filteredTransactions.length ? 'All Loaded' : 'Load More'}
                </span>
              </SecondaryButton>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="text-center p-3 lg:p-4 bg-slate-700/30 rounded-lg">
                <div className="text-xl lg:text-2xl font-bold text-white">{transactionStats.total}</div>
                <div className="text-slate-400 text-xs lg:text-sm">Total</div>
              </div>
              <div className="text-center p-3 lg:p-4 bg-slate-700/30 rounded-lg">
                <div className="text-xl lg:text-2xl font-bold text-green-400">
                  {transactionStats.confirmed}
                </div>
                <div className="text-slate-400 text-xs lg:text-sm">Confirmed</div>
              </div>
              <div className="text-center p-3 lg:p-4 bg-slate-700/30 rounded-lg">
                <div className="text-xl lg:text-2xl font-bold text-yellow-400">
                  {transactionStats.pending}
                </div>
                <div className="text-slate-400 text-xs lg:text-sm">Pending</div>
              </div>
              <div className="text-center p-3 lg:p-4 bg-slate-700/30 rounded-lg">
                <div className="text-xl lg:text-2xl font-bold text-red-400">
                  {transactionStats.failed}
                </div>
                <div className="text-slate-400 text-xs lg:text-sm">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WalletLayout>
  );
};

export default ActionHistory;
