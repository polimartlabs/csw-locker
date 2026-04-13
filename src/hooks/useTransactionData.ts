import { fetchStxUsdPrice } from '@/lib/stxPrice';
import { AccountBalanceService } from '@/services/accountBalanceService';
import { FtResponseBalance } from '@/services/interfaces';
import { TransactionDataService } from '@/services/transactionDataService';
import { TxInfo } from '@/services/types';
import { getClientConfig } from '@/utils/chain-config';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface AssetDecimals {
  [symbol: string]: number;
}

interface TransactionStats {
  total: number;
  confirmed: number;
  pending: number;
  failed: number;
}

interface UseTransactionDataReturn {
  transactions: TxInfo[];
  isLoading: boolean;
  hasMore: boolean;
  refreshing: boolean;
  stxUsd: number | null;
  assetDecimals: AssetDecimals;
  transactionStats: TransactionStats;
  txActions: string[];
  fetchTransactions: (offset?: number) => void;
  handleRefresh: () => Promise<void>;
  loadMore: () => void;
}

const transactionService = new TransactionDataService();
const accountBalanceService = new AccountBalanceService();

export const useTransactionData = (walletAddress?: string) => {
  const [transactions, setTransactions] = useState<TxInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stxUsd, setStxUsd] = useState<number | null>(null);
  const [assetDecimals, setAssetDecimals] = useState<AssetDecimals>({
    STX: 6,
    SBTC: 8,
  });

  // Use refs to avoid dependency loops
  const assetDecimalsRef = useRef<AssetDecimals>({ STX: 6, SBTC: 8 });
  const walletAddressRef = useRef<string | undefined>(walletAddress);

  // Update refs when values change
  useEffect(() => {
    assetDecimalsRef.current = assetDecimals;
  }, [assetDecimals]);

  useEffect(() => {
    walletAddressRef.current = walletAddress;
  }, [walletAddress]);

  // Fetch STX USD price
  useEffect(() => {
    fetchStxUsdPrice().then(setStxUsd);
  }, []);

  // Helper function to fetch decimals for asset symbols
  const fetchDecimalsForSymbols = useCallback(async (transactions: TxInfo[], walletAddress: string) => {
    if (!walletAddress || transactions.length === 0) return;

    try {
      // Extract unique asset identifiers from transactions
      const assetIdentifiers = new Set<string>();
      const symbolToAssetMap = new Map<string, string>();

      transactions.forEach(tx => {
        tx.assets.forEach(asset => {
          if (asset.asset && asset.asset !== 'STX' && asset.asset !== 'SBTC') {
            assetIdentifiers.add(asset.asset);
            symbolToAssetMap.set(asset.symbol, asset.asset);
          }
        });
      });

      if (assetIdentifiers.size === 0) return;

      // Convert asset identifiers to FtResponseBalance format for the API
      const ftTokens: FtResponseBalance[] = Array.from(assetIdentifiers).map(assetId => ({
        balance: '0',
        total_sent: '0',
        total_received: '0',
        asset_identifier: assetId
      }));

      // Fetch metadata for these tokens
      const config = {
        baseUrl: getClientConfig(walletAddress).api
      };
      const metadata = await accountBalanceService.fetchFtMetadata(ftTokens, walletAddress, config);
      
      // Extract decimals from metadata
      const newDecimals: AssetDecimals = {};
      Object.entries(metadata).forEach(([assetId, meta]) => {
        if (meta && typeof meta === 'object' && 'decimals' in meta) {
          // Find the symbol for this asset identifier
          const symbol = Array.from(symbolToAssetMap.entries())
            .find(([_, asset]) => asset === assetId)?.[0];
          
          if (symbol) {
            newDecimals[symbol] = meta.decimals;
          }
        }
      });

      // Update state if we found new decimals
      if (Object.keys(newDecimals).length > 0) {
        setAssetDecimals(prev => ({ ...prev, ...newDecimals }));
      } else {
        // Fallback: set default decimals for symbols we couldn't fetch
        const fallbackDecimals: AssetDecimals = {};
        Array.from(symbolToAssetMap.keys()).forEach(symbol => {
          if (!assetDecimals[symbol]) {
            // Use reasonable defaults based on symbol patterns
            if (symbol.includes('token') || symbol.includes('Token')) {
              fallbackDecimals[symbol] = 6; // Most tokens use 6 decimals
            } else {
              fallbackDecimals[symbol] = 0; // Default for NFTs or unknown
            }
          }
        });
        
        if (Object.keys(fallbackDecimals).length > 0) {
          setAssetDecimals(prev => ({ ...prev, ...fallbackDecimals }));
        }
      }
    } catch (error) {
      console.warn('Failed to fetch decimals for transactions:', error);
      
      // Fallback: set default decimals for all symbols
      const fallbackDecimals: AssetDecimals = {};
      transactions.forEach(tx => {
        tx.assets.forEach(asset => {
          if (asset.symbol && !assetDecimals[asset.symbol] && asset.symbol !== 'STX' && asset.symbol !== 'SBTC') {
            if (asset.symbol.includes('token') || asset.symbol.includes('Token')) {
              fallbackDecimals[asset.symbol] = 6;
            } else {
              fallbackDecimals[asset.symbol] = 0;
            }
          }
        });
      });
      
      if (Object.keys(fallbackDecimals).length > 0) {
        setAssetDecimals(prev => ({ ...prev, ...fallbackDecimals }));
      }
    }
  }, []);


  const fetchTransactions = useCallback((currentOffset: number = 0) => {
    const currentWalletAddress = walletAddressRef.current;
    if (!currentWalletAddress) return;
    
    setIsLoading(true);
    transactionService.handleGetSwTx(
      currentWalletAddress,
      currentOffset,
      (cb) => {
        if (currentOffset === 0) {
          const newTransactions = cb([]);
          setTransactions(newTransactions);
          setHasMore(newTransactions.length === 20);
          
          // Fetch decimals using accountBalanceService
          console.log('newTransactions', {newTransactions});
          if (newTransactions.length > 0) {
            fetchDecimalsForSymbols(newTransactions, currentWalletAddress);
          }
        } else {
          setTransactions(prev => {
            const newTxs = cb(prev).filter(tx => !prev.some(existing => existing.tx === tx.tx));
            setHasMore(newTxs.length === 20);
            
            // Fetch decimals using accountBalanceService
            if (newTxs.length > 0) {
              fetchDecimalsForSymbols(newTxs, currentWalletAddress);
            }
            
            return [...prev, ...newTxs];
          });
        }
        setIsLoading(false);
        return [];
      }
    );
  }, [fetchDecimalsForSymbols]); // Add fetchDecimalsForSymbols dependency

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    await fetchTransactions(0);
    setRefreshing(false);
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const newOffset = offset + 20;
      setOffset(newOffset);
      fetchTransactions(newOffset);
    }
  }, [isLoading, hasMore, offset, fetchTransactions]);

  // Reset when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      setOffset(0);
      setTransactions([]);
      setHasMore(true);
      fetchTransactions(0);
    }
  }, [walletAddress, fetchTransactions]);

  const transactionStats = useMemo(() => ({
    total: transactions.length,
    confirmed: transactions.filter(tx => tx.tx_status === 'confirmed').length,
    pending: transactions.filter(tx => tx.tx_status === 'pending').length,
    failed: transactions.filter(tx => tx.tx_status === 'failed').length
  }), [transactions]);

  const txActions = useMemo(() =>
    Array.from(new Set(transactions.map(tx => tx.action)))
  , [transactions]);

  return {
    transactions,
    isLoading,
    hasMore,
    refreshing,
    stxUsd,
    assetDecimals,
    transactionStats,
    txActions,
    fetchTransactions,
    handleRefresh,
    loadMore,
  };
};
