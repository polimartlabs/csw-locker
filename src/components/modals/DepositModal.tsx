import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Coins, Image } from "lucide-react";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { useTxServices } from "@/hooks/useTxServices";
import { useUserWalletConnection } from "@/hooks/useWalletConnection";
import { AccountBalanceService } from "@/services/accountBalanceService";
import { formatClarityValues } from "@/utils/formartClarityValues";
import { getClientConfig } from "@/utils/chain-config";

// NFT Item Card Component for progressive rendering
const NftItemCard = ({ item, isSelected, onSelect, onFetchMetadata, delay = 0 }: {
  item: any;
  isSelected: boolean;
  onSelect: (item: any) => void;
  onFetchMetadata: (item: any) => Promise<any>;
  delay?: number;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMetadata, setHasMetadata] = useState(!!item.metadata);

  // Fetch metadata when component mounts if not already loaded
  useEffect(() => {
    if (!hasMetadata && !isLoading) {
      const fetchWithDelay = async () => {
        // Add delay before fetching metadata
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        setIsLoading(true);
        try {
          await onFetchMetadata(item);
          setHasMetadata(true);
        } catch (error) {
          console.warn('Failed to fetch metadata for item:', item.asset_identifier, error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchWithDelay();
    }
  }, [item, hasMetadata, isLoading, onFetchMetadata, delay]);

  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
        ? 'border-purple-500 bg-purple-500/20'
        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
        }`}
      onClick={() => onSelect(item)}
    >
      <div className="aspect-square mb-2 rounded-lg overflow-hidden bg-slate-600">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
          </div>
        ) : hasMetadata && (item.metadata?.metadata?.cached_thumbnail_image || item.metadata?.metadata?.cached_image) ? (
          <img
            src={item.metadata.metadata.cached_thumbnail_image || item.metadata.metadata.cached_image}
            alt={item.metadata.metadata.name || 'NFT'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <span className="text-xs">No Image</span>
          </div>
        )}
      </div>
      <div className="text-xs text-slate-300 truncate">
        {isLoading ? (
          <span className="text-slate-500">Loading...</span>
        ) : hasMetadata && item.metadata?.metadata?.name ? (
          item.metadata.metadata.name
        ) : (
          `Token #${formatClarityValues(item?.value?.hex || '')}`
        )}
      </div>
      <div className="text-xs text-slate-500">
        ID: {formatClarityValues(item?.value?.hex || '')}
      </div>
    </div>
  );
};

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  onSuccess?: (result: { txid: string }) => void;
  onError?: (error: string) => void;
}

const DepositModal = ({ isOpen, onClose, walletId, onSuccess, onError }: DepositModalProps) => {
  const { userData: walletData } = useUserWalletConnection();
  const {
    loading: balanceLoading,
    error: balanceError,
    ftBalance,
    ftMetadata,
    nftBalance,
    nftMetadata,
    nftHoldings,
    nftItemsWithMetadata,
    holdingsLoading,
    metadataLoading,
    hasMore,
    currentOffset,
    fetchNftHoldings,
    fetchNftItemsMetadata,
    fetchSingleNftItemMetadata,
    loadMoreNftHoldings
  } = useAccountBalanceService(walletData?.addresses.stx[0]?.address);

  const { deposit } = useTxServices();

  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState<{ txid: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMaxWarning, setShowMaxWarning] = useState(false);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<string>('');
  const [isNftMode, setIsNftMode] = useState(false);
  const [selectedNftItem, setSelectedNftItem] = useState<any>(null);

  // State for processed tokens with metadata
  const [processedFtTokens, setProcessedFtTokens] = useState<any[]>([]);
  const [processedNftTokens, setProcessedNftTokens] = useState<any[]>([]);

  const copyToClipboard = () => {
    if (walletId) {
      navigator.clipboard.writeText(walletId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  // Fetch metadata with delays to avoid CORS errors
  useEffect(() => {
    if (ftBalance.length === 0) {
      setProcessedFtTokens([]);
      return;
    }

    const fetchMetadataWithDelays = async () => {
      const processedTokens = [];

      for (let i = 0; i < ftBalance.length; i++) {
        const ft = ftBalance[i];

        // Check if metadata already exists
        const existingMetadata = ftMetadata[ft.asset_identifier];

        if (existingMetadata) {
          // Use existing metadata
          processedTokens.push({
            ...ft,
            name: existingMetadata?.name || ft.asset_identifier.split("::")[1] || "Unknown Token",
            symbol: existingMetadata?.symbol || ft.asset_identifier.split("::")[1] || "UNK",
            contract: ft.asset_identifier.split("::")[0],
            icon: existingMetadata?.image_thumbnail_uri || existingMetadata?.image_uri || "",
            decimal: existingMetadata?.decimals || 0
          });
        } else {
          // Fetch metadata with delay
          try {
            // Add delay between requests (200ms)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }

            const balancesService = new AccountBalanceService();
            const metadata = await balancesService.fetchFtMetadata([ft], walletId, {
              baseUrl: getClientConfig(walletId).api
            });

            const tokenMetadata = metadata[ft.asset_identifier];

            processedTokens.push({
              ...ft,
              name: tokenMetadata?.name || ft.asset_identifier.split("::")[1] || "Unknown Token",
              symbol: tokenMetadata?.symbol || ft.asset_identifier.split("::")[1] || "UNK",
              contract: ft.asset_identifier.split("::")[0],
              icon: tokenMetadata?.image_thumbnail_uri || tokenMetadata?.image_uri || "",
              decimal: tokenMetadata?.decimals || 0
            });
          } catch (error) {
            console.warn(`Failed to fetch metadata for ${ft.asset_identifier}:`, error);
            // Fallback to basic info if metadata fetch fails
            processedTokens.push({
              ...ft,
              name: ft.asset_identifier.split("::")[1] || "Unknown Token",
              symbol: ft.asset_identifier.split("::")[1] || "UNK",
              contract: ft.asset_identifier.split("::")[0],
              icon: "",
              decimal: 0
            });
          }
        }
      }

      setProcessedFtTokens(processedTokens);
    };

    fetchMetadataWithDelays();
  }, [ftBalance, ftMetadata, walletId]);

  // Fetch NFT metadata with delays to avoid CORS errors
  useEffect(() => {
    if (nftBalance.length === 0) {
      setProcessedNftTokens([]);
      return;
    }

    const fetchNftMetadataWithDelays = async () => {
      const processedTokens = [];

      for (let i = 0; i < nftBalance.length; i++) {
        const nft = nftBalance[i];

        // Check if metadata already exists
        const existingMetadata = nftMetadata[nft.asset_identifier];

        if (existingMetadata) {
          // Use existing metadata
          processedTokens.push({
            ...nft,
            name: existingMetadata?.metadata?.name || nft.asset_identifier.split("::")[1] || "Unknown NFT",
            symbol: nft.asset_identifier.split("::")[1] || "UNK",
            contract: nft.asset_identifier.split("::")[0],
            icon: existingMetadata?.metadata?.cached_thumbnail_image || existingMetadata?.metadata?.image || "",
            tokenId: nft.count
          });
        } else {
          // Fetch metadata with delay
          try {
            // Add delay between requests (200ms)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }

            const balancesService = new AccountBalanceService();
            const metadata = await balancesService.fetchNftMetadata([nft], walletId, {
              baseUrl: getClientConfig(walletId).api
            });

            const tokenMetadata = metadata[nft.asset_identifier];

            processedTokens.push({
              ...nft,
              name: tokenMetadata?.metadata?.name || nft.asset_identifier.split("::")[1] || "Unknown NFT",
              symbol: nft.asset_identifier.split("::")[1] || "UNK",
              contract: nft.asset_identifier.split("::")[0],
              icon: tokenMetadata?.metadata?.cached_thumbnail_image || tokenMetadata?.metadata?.image || "",
              tokenId: nft.count
            });
          } catch (error) {
            console.warn(`Failed to fetch NFT metadata for ${nft.asset_identifier}:`, error);
            // Fallback to basic info if metadata fetch fails
            processedTokens.push({
              ...nft,
              name: nft.asset_identifier.split("::")[1] || "Unknown NFT",
              symbol: nft.asset_identifier.split("::")[1] || "UNK",
              contract: nft.asset_identifier.split("::")[0],
              icon: "",
              tokenId: nft.count
            });
          }
        }
      }

      setProcessedNftTokens(processedTokens);
    };

    fetchNftMetadataWithDelays();
  }, [nftBalance, nftMetadata, walletId]);

  // Get current tokens based on mode
  const currentTokens = isNftMode ? processedNftTokens : processedFtTokens;

  // Find the selected token
  const selectedToken = selectedAssetIndex ? currentTokens[parseInt(selectedAssetIndex)] : null;

  const resetForm = () => {
    setSelectedAssetIndex('');
    setDepositAmount('');
    setShowMaxWarning(false);
    setDepositSuccess(null);
    setSelectedNftItem(null);
  };

  // Function to fetch NFT holdings when an NFT is selected
  const handleNftSelection = async (selectedIndex: string) => {
    if (!isNftMode) return;

    const selectedNft = processedNftTokens[parseInt(selectedIndex)];
    if (selectedNft) {
      console.log('Fetching holdings for NFT:', selectedNft.asset_identifier);
      setSelectedNftItem(null); // Reset selected item
      await fetchNftHoldings([selectedNft.asset_identifier]);
    }
  };

  // Function to select individual NFT item
  const handleNftItemSelection = (nftItem: any) => {
    setSelectedNftItem(nftItem);
    console.log('Selected NFT item:', nftItem);
  };

  // Function to load more NFT holdings
  const handleLoadMore = async () => {
    if (!isNftMode || !selectedAssetIndex) return;

    const selectedNft = processedNftTokens[parseInt(selectedAssetIndex)];
    if (selectedNft) {
      await loadMoreNftHoldings([selectedNft.asset_identifier]);
    }
  };

  const handleDeposit = async () => {
    if (!walletId || !selectedToken) return;
    setIsDepositing(true);
    try {
      const result = await deposit({
        from: walletData?.addresses.stx[0]?.address,
        to: walletId,
        amount: depositAmount,
        asset: isNftMode ? (selectedNftItem?.metadata?.metadata?.name || selectedToken?.symbol) : selectedToken?.symbol || "",
        assetType: isNftMode ? "nft" : "ft",
        decimal: isNftMode ? 0 : selectedToken?.decimal || 0,
        contractAddress: isNftMode ? (selectedNftItem?.asset_identifier || selectedToken?.asset_identifier) : selectedToken?.asset_identifier || "",
        tokenId: isNftMode ? formatClarityValues(selectedNftItem?.value?.hex) : undefined
      });
      setDepositSuccess(result);
      onSuccess?.(result);
    } catch (e) {
      onError?.(String(e));
    } finally {
      setIsDepositing(false);
    }
  };

  const available = useMemo(() => isNftMode ? 1 : (+selectedToken?.balance || 0), [selectedToken, isNftMode]);

  // Handler for Max button
  const handleMax = () => {
    if (available > 0 && !isNftMode) {
      setDepositAmount(available.toString());
      setShowMaxWarning(true);
    }
  };

  // Handler for input change (prevent exceeding balance)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNftMode) return; // NFTs don't have amount input

    const val = e.target.value;
    if (!val || isNaN(Number(val))) {
      setDepositAmount(val);
      return;
    }
    if (Number(val) > available) {
      setDepositAmount(available.toString());
    } else {
      setDepositAmount(val);
    }
    setShowMaxWarning(false);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/90 border text-white border-slate-700 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between mt-10">
            Deposit to Smart Wallet
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 bg-slate-700/50 p-1 rounded-xl border border-slate-600 hover:border-slate-500 transition-all duration-300">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer ${!isNftMode
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-600/50'
                  }`}
                  onClick={() => setIsNftMode(false)}
                >
                  <Coins className="w-4 h-4" />
                  <span className="text-sm font-medium">FT</span>
                </div>
                <Switch
                  checked={isNftMode}
                  onCheckedChange={setIsNftMode}
                  className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-slate-600 transition-all duration-300 mx-1"
                />
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer ${isNftMode
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-600/50'
                  }`}
                  onClick={() => setIsNftMode(true)}
                >
                  <Image className="w-4 h-4" />
                  <span className="text-sm font-medium">NFT</span>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        {depositSuccess ? (
          <div className="flex flex-col gap-4 items-center">
            <div className="text-green-400 font-bold text-lg">Deposit Successful!</div>
            <div className="text-white text-sm break-all">TxID: {depositSuccess.txid}</div>
            <a
              href={getClientConfig(walletId).explorer(`txid/${depositSuccess.txid}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline mt-2"
            >
              View on Explorer
            </a>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <label className="text-slate-300 text-sm">{isNftMode ? "NFT Asset" : "Token Asset"}</label>
              <Select
                value={selectedAssetIndex}
                onValueChange={(value) => {
                  setSelectedAssetIndex(value);
                  handleNftSelection(value);
                }}
                required
                disabled={balanceLoading || metadataLoading}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500">
                  <SelectValue placeholder={balanceLoading || metadataLoading ? "Loading..." : (isNftMode ? "Select NFT" : "Select Token")} />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {currentTokens.map((token, i) => (
                    <SelectItem
                      value={i.toString()}
                      key={i}
                      className="text-white hover:bg-slate-600 focus:bg-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={token.symbol === 'stx' ? '/stx.png' : token.icon}
                          alt={token.name}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-left">{token.name} {`(${token.symbol})`}</div>
                          <div className="text-sm text-slate-400 text-left">
                            {isNftMode ? `Holdings: ${token.tokenId}` : `${token.balance || "0"} available`}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* NFT Items Display */}
              {isNftMode && nftItemsWithMetadata.length > 0 && (
                <div className="space-y-2">
                  <label className="text-slate-300 text-sm">Select NFT Item</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    {nftItemsWithMetadata.map((item, index) => (
                      <NftItemCard
                        key={`${item.asset_identifier}-${item.value?.repr || index}`}
                        item={item}
                        isSelected={selectedNftItem?.value?.repr === item.value?.repr}
                        onSelect={handleNftItemSelection}
                        onFetchMetadata={fetchSingleNftItemMetadata}
                        delay={index * 300} // 300ms delay between each item
                      />
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <Button
                      onClick={handleLoadMore}
                      disabled={holdingsLoading}
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white"
                    >
                      {holdingsLoading ? 'Loading...' : 'Load More'}
                    </Button>
                  )}

                  {/* Loading indicator for metadata */}
                  {metadataLoading && (
                    <div className="text-xs text-slate-400 text-center">
                      Loading metadata...
                    </div>
                  )}
                </div>
              )}

              {!isNftMode && (
                <>
                  <label className="text-slate-300 text-sm flex items-center justify-between">
                    Amount
                    <Button
                      type="button"
                      size="sm"
                      className="ml-2 bg-slate-600 hover:bg-slate-700 text-xs px-2 py-1"
                      onClick={handleMax}
                      disabled={balanceLoading || available === 0}
                    >
                      Max
                    </Button>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder={balanceLoading ? "Loading..." : `Max: ${available.toFixed(6)}`}
                    value={depositAmount}
                    onChange={handleAmountChange}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    disabled={isDepositing || balanceLoading}
                  />
                  {showMaxWarning && (
                    <div className="text-xs text-yellow-400 mt-1">Warning: You are about to deposit your entire {selectedToken?.symbol} balance.</div>
                  )}
                </>
              )}
              <label className="text-slate-300 text-sm">To Wallet</label>
              <div className="flex items-center space-x-2">
                <Input value={walletId || "Loading..."} readOnly className="bg-slate-700/50 border-slate-600 text-white text-center" />
                <Button onClick={copyToClipboard} className="bg-purple-600 hover:bg-purple-700" disabled={!walletId}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {balanceError && (
                <div className="text-xs text-red-400 mt-1">Error loading balance.</div>
              )}
              <div className="text-xs text-slate-400 mt-1">
                {isNftMode
                  ? (selectedToken ? `Selected: ${selectedToken.name} (Holdings: ${selectedToken.tokenId})` : "Select an NFT")
                  : (balanceLoading ? "Loading..." : selectedToken ? `Available: ${available.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedToken.symbol}` : "Select a token")
                }
                {isNftMode && selectedToken && nftHoldings && (
                  <div className="text-xs text-slate-500 mt-1">
                    {holdingsLoading ? "Loading holdings..." : `Found ${nftHoldings.results?.length || 0} NFT items`}
                  </div>
                )}
                {isNftMode && selectedNftItem && (
                  <div className="text-xs text-purple-400 mt-1">
                    Selected: {selectedNftItem.metadata?.metadata?.name || `Token #${formatClarityValues(selectedNftItem?.value?.hex || '')}`}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                onClick={resetForm}
                variant="outline"
                className="flex-1 bg-slate-600 hover:bg-slate-700 border-slate-500 text-white"
                disabled={isDepositing}
              >
                Reset
              </Button>
              <Button
                onClick={handleDeposit}
                disabled={!selectedToken || (isNftMode && !selectedNftItem) || (!isNftMode && (!depositAmount || Number(depositAmount) > available || Number(depositAmount) <= 0)) || isDepositing || balanceLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isDepositing
                  ? `Depositing...`
                  : isNftMode
                    ? selectedNftItem
                      ? `Deposit ${selectedNftItem.metadata?.metadata?.name || `Token #${formatClarityValues(selectedNftItem?.value?.hex || '')}`}`
                      : 'Select NFT Item'
                    : `Deposit ${(Number(depositAmount)).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${selectedToken?.symbol}`
                }
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
