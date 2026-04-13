import { useEffect, useState, useMemo } from "react";
import { AccountBalanceService } from "@/services/accountBalanceService";
import { MockAccountBalanceService } from "@/services/mocks/mockAccountBalanceService";
import {
  FungibleType,
  NftResponseBalance,
  FtResponseBalance,
  AccountBalanceType,
  NftMetadataResponse,
} from "@/services/types";
import { getClientConfig } from "@/utils/chain-config";
import { toast } from "./use-toast";
import { useDemoMode } from "@/contexts";

export function useAccountBalanceService(walletAddress: string) {
  const [stxBalance, setStxBalance] = useState<FungibleType | null>(null);
  const [sBtcBalance, setSBtcBalance] = useState<FungibleType | null>(null);

  // Check if we're in demo mode
  const isDemoMode = useDemoMode();

  // Select the appropriate service based on demo mode
  const balancesService = useMemo(() => {
    return isDemoMode
      ? new MockAccountBalanceService()
      : new AccountBalanceService();
  }, [isDemoMode]);
  const [nftBalance, setNftBalance] = useState<NftResponseBalance[]>([]);
  const [ftBalance, setFtBalance] = useState<FtResponseBalance[]>([]);
  const [rawBalance, setRawBalance] = useState<AccountBalanceType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nftMetadata, setNftMetadata] = useState<
    Record<string, NftMetadataResponse>
  >({});
  const [ftMetadata, setFtMetadata] = useState<
    Record<string, import("@/services/types").ftInfoType | null>
  >({});
  const [nftHoldings, setNftHoldings] = useState<{
    results: import("@/services/types").nftAssetType[];
    total: number;
  } | null>(null);
  const [nftItemsWithMetadata, setNftItemsWithMetadata] = useState<
    (import("@/services/types").nftAssetType & {
      metadata?: import("@/services/types").metaDataType;
      metadataLoading: boolean;
    })[]
  >([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      // Reset state when no address
      setStxBalance(null);
      setSBtcBalance(null);
      setNftBalance([]);
      setFtBalance([]);
      setRawBalance(null);
      setNftMetadata({});
      setFtMetadata({});
      setError(null);
      return;
    }

    // Clear cache when wallet address changes to avoid stale data
    balancesService.clearCache();
    setLoading(true);
    setError(null);

    balancesService
      .getAccountBalances(walletAddress, {
        baseUrl: getClientConfig(walletAddress).api,
      })
      .then((balances) => {
        if (balances) {
          setStxBalance(balances.stx);
          setSBtcBalance(balances.sbtc);
          setNftBalance(balances.nft || []);

          // Filter out tokens with 0 balance and include STX and sBTC
          const filteredFtBalance = (balances.ft || []).filter(
            (ft) =>
              ft.balance && ft.balance !== "0" && ft.balance !== "0.000000"
          );

          // Add STX and sBTC to ftBalance if they have non-zero balances
          const combinedFtBalance = [...filteredFtBalance];

          if (
            balances.stx &&
            balances.stx.balance &&
            balances.stx.balance !== "0"
          ) {
            combinedFtBalance.push({
              balance: balances.stx.balance,
              total_sent: balances.raw.stx.total_sent || "0",
              total_received: balances.raw.stx.total_received || "0",
              asset_identifier: ".stacks::stx",
            });
          }

          if (
            balances.sbtc &&
            balances.sbtc.balance &&
            balances.sbtc.balance !== "0"
          ) {
            combinedFtBalance.push({
              balance: balances.sbtc.balance,
              total_sent: "0",
              total_received: "0",
              asset_identifier:
                balances.sbtc.asset_identifier ||
                "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token",
            });
          }

          setFtBalance(combinedFtBalance);
          setRawBalance(balances);

          // Fetch metadata separately for better performance
          // Only fetch metadata for the first 10 tokens to avoid rate limiting
          const limitedFtTokens = combinedFtBalance.slice(0, 10);
          const limitedNftTokens = (balances.nft || []).slice(0, 10);

          if (limitedFtTokens.length > 0 || limitedNftTokens.length > 0) {
            balancesService
              .fetchAllMetadata(
                limitedFtTokens,
                limitedNftTokens,
                walletAddress,
                { baseUrl: getClientConfig(walletAddress).api }
              )
              .then((metadata) => {
                setNftMetadata(metadata.nftMetadata);
                setFtMetadata(metadata.ftMetadata);
              })
              .catch((error) => {
                // Don't set error state for metadata failures, just log warning
              });
          }
        } else {
          setError("Failed to fetch account balances");
        }
      })
      .catch((e) => {
        const errorMessage = e?.message || "Failed to fetch account balances";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [walletAddress, balancesService]);

  // Function to fetch NFT holdings for specific assets with pagination
  const fetchNftHoldings = async (
    assetIdentifiers: string[],
    offset: number = 0,
    limit: number = 50
  ) => {
    if (!walletAddress || !assetIdentifiers || assetIdentifiers.length === 0) {
      return null;
    }

    setHoldingsLoading(true);
    try {
      const balancesService = new AccountBalanceService();
      const holdings = await balancesService.fetchNftHoldings(
        walletAddress,
        assetIdentifiers,
        offset,
        limit,
        { baseUrl: getClientConfig(walletAddress).api }
      );

      setNftHoldings(holdings);
      setCurrentOffset(offset);
      setHasMore(holdings?.results?.length === limit);

      // Initialize items without metadata for progressive loading
      if (holdings?.results && holdings.results.length > 0) {
        const itemsWithoutMetadata = holdings.results.map((item) => ({
          ...item,
          metadata: null,
          metadataLoading: false,
        }));
        setNftItemsWithMetadata(itemsWithoutMetadata);
      }

      return holdings;
    } catch (error) {
      setError("Failed to fetch NFT holdings");
      return null;
    } finally {
      setHoldingsLoading(false);
    }
  };

  // Function to fetch metadata for NFT items
  const fetchNftItemsMetadata = async (
    nftItems: import("@/services/types").nftAssetType[]
  ) => {
    if (!nftItems || nftItems.length === 0) {
      return [];
    }

    setMetadataLoading(true);
    try {
      const balancesService = new AccountBalanceService();
      const itemsWithMetadata = await balancesService.fetchNftItemsMetadata(
        nftItems,
        { baseUrl: getClientConfig(walletAddress).api }
      );

      setNftItemsWithMetadata(itemsWithMetadata);
      return itemsWithMetadata;
    } catch (error) {
      setError("Failed to fetch NFT items metadata");
      return [];
    } finally {
      setMetadataLoading(false);
    }
  };

  // Function to fetch metadata for a single NFT item progressively
  const fetchSingleNftItemMetadata = async (
    item: import("@/services/types").nftAssetType
  ) => {
    if (!item) {
      return null;
    }

    try {
      const balancesService = new AccountBalanceService();
      const itemWithMetadata = await balancesService.fetchSingleNftItemMetadata(
        item,
        { baseUrl: getClientConfig(walletAddress).api }
      );

      // Update the specific item in the array
      setNftItemsWithMetadata((prev) => {
        const updated = [...prev];
        const index = updated.findIndex(
          (existingItem) =>
            existingItem.asset_identifier === item.asset_identifier &&
            existingItem.value?.repr === item.value?.repr
        );

        if (index !== -1) {
          updated[index] = itemWithMetadata;
        } else {
          updated.push(itemWithMetadata);
        }

        return updated;
      });

      return itemWithMetadata;
    } catch (error) {
      return null;
    }
  };

  // Function to load more NFT holdings (pagination)
  const loadMoreNftHoldings = async (assetIdentifiers: string[]) => {
    if (!hasMore || holdingsLoading) return;

    const nextOffset = currentOffset + 50; // Assuming limit is 50
    await fetchNftHoldings(assetIdentifiers, nextOffset);
  };

  return {
    stxBalance,
    sBtcBalance,
    nftBalance,
    ftBalance,
    rawBalance,
    loading,
    error,
    nftMetadata,
    ftMetadata,
    nftHoldings,
    nftItemsWithMetadata,
    holdingsLoading,
    metadataLoading,
    hasMore,
    currentOffset,
    fetchNftHoldings,
    fetchNftItemsMetadata,
    fetchSingleNftItemMetadata,
    loadMoreNftHoldings,
  };
}
