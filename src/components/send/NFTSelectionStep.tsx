import PrimaryButton from "@/components/ui/primary-button";
import SecondaryButton from "@/components/ui/secondary-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { formatClarityValues } from "@/utils/formartClarityValues";

interface NFTSelectionStepProps {
   asset: string;
   tokenId: string;
   contractAddress: string;
   onAssetChange: (asset: string) => void;
   onTokenIdChange: (tokenId: string) => void;
   onContractAddressChange: (contractAddress: string) => void;
   onNext: () => void;
   onBack: () => void;
}

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
               `Token #${formatClarityValues(item?.value?.hex)}`
            )}
         </div>
         <div className="text-xs text-slate-500">
            ID: #{formatClarityValues(item?.value?.hex)}
         </div>
      </div>
   );
};

const NFTSelectionStep = ({
   asset,
   tokenId,
   contractAddress,
   onAssetChange,
   onTokenIdChange,
   onContractAddressChange,
   onNext,
   onBack,
}: NFTSelectionStepProps) => {
   const { walletId } = useParams<{ walletId: `${string}.${string}` }>();

   // Use the hook to get NFT balances and metadata
   const {
      nftBalance,
      nftMetadata,
      nftHoldings,
      nftItemsWithMetadata,
      holdingsLoading,
      metadataLoading,
      hasMore,
      currentOffset,
      fetchNftHoldings,
      fetchSingleNftItemMetadata,
      loadMoreNftHoldings
   } = useAccountBalanceService(walletId);

   // State for processed NFT tokens and selected items
   const [processedNftTokens, setProcessedNftTokens] = useState<any[]>([]);
   const [selectedNftItem, setSelectedNftItem] = useState<any>(null);
   const [selectedAssetIndex, setSelectedAssetIndex] = useState<string>('');

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

                  const { AccountBalanceService } = await import("@/services/accountBalanceService");
                  const balancesService = new AccountBalanceService();
                  const metadata = await balancesService.fetchNftMetadata([nft], walletId);

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

   // Function to fetch NFT holdings when an NFT is selected
   const handleNftSelection = async (selectedIndex: string) => {
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

      // Update the form values
      onAssetChange(nftItem.asset_identifier);
      onTokenIdChange(formatClarityValues(nftItem?.value?.hex || ''));
      onContractAddressChange(nftItem.asset_identifier.split("::")[0]);
   };

   // Function to load more NFT holdings
   const handleLoadMore = async () => {
      if (!selectedAssetIndex) return;

      const selectedNft = processedNftTokens[parseInt(selectedAssetIndex)];
      if (selectedNft) {
         await loadMoreNftHoldings([selectedNft.asset_identifier]);
      }
   };

   const isValid = asset && tokenId && contractAddress;

   return (
      <div className="space-y-6">
         <h3 className="text-lg font-semibold text-white">
            Select NFT Details
         </h3>

         {processedNftTokens.length > 0 && !holdingsLoading && !metadataLoading ? (
            <>
               <div className="space-y-2">
                  <Label htmlFor="nftAsset" className="text-slate-300">
                     Select NFT Collection
                  </Label>
                  <Select
                     value={selectedAssetIndex}
                     onValueChange={(value) => {
                        setSelectedAssetIndex(value);
                        handleNftSelection(value);
                     }}
                     required={true}
                     disabled={holdingsLoading || metadataLoading}
                  >
                     <SelectTrigger className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500">
                        <SelectValue placeholder={holdingsLoading || metadataLoading ? "Loading..." : "Choose an NFT collection"} />
                     </SelectTrigger>
                     <SelectContent className="bg-slate-700 border-slate-600">
                        {processedNftTokens.map((nft, index) => (
                           <SelectItem
                              value={index.toString()}
                              key={nft.asset_identifier}
                              className="text-white hover:bg-slate-600 focus:bg-slate-600"
                           >
                              <div className="flex items-center gap-3">
                                 <img
                                    src={nft.icon}
                                    alt={nft.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                    onError={(e) => {
                                       e.currentTarget.style.display = 'none';
                                    }}
                                 />
                                 <div className="flex-1">
                                    <div className="font-medium text-left">{nft.name} {`(${nft.symbol})`}</div>
                                    <div className="text-sm text-slate-400 text-left">
                                       Holdings: {nft.tokenId}
                                    </div>
                                 </div>
                              </div>
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>

                  {/* Loading indicator for collection metadata */}
                  {metadataLoading && (
                     <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                        Loading collection metadata...
                     </div>
                  )}
               </div>

               {/* NFT Items Display */}
               {selectedAssetIndex && (
                  <div className="space-y-2">
                     <Label className="text-slate-300 text-sm">Select NFT Item</Label>

                     {/* Holdings loading state */}
                     {holdingsLoading ? (
                        <div className="flex items-center justify-center py-8">
                           <div className="flex flex-col items-center gap-3">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                              <span className="text-sm text-slate-400">Loading NFT holdings...</span>
                           </div>
                        </div>
                     ) : nftItemsWithMetadata.length > 0 ? (
                        <>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[20rem] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
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

                           {/* Loading indicator for individual item metadata */}
                           {metadataLoading && (
                              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-2">
                                 <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                                 Loading item metadata...
                              </div>
                           )}
                        </>
                     ) : (
                        <div className="text-center py-8">
                           <div className="text-slate-400 text-sm">
                              No NFT items found in this collection.
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* Selected NFT Item Info */}
               {selectedNftItem && (
                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                     <h4 className="text-sm font-medium text-white mb-2">Selected NFT Item</h4>
                     <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                           <span className="text-slate-400">Name:</span>
                           <span className="text-white">{selectedNftItem.metadata?.metadata?.name || `Token #${formatClarityValues(selectedNftItem?.value?.hex || '')}`}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-slate-400">Token ID:</span>
                           <span className="text-white">#{formatClarityValues(selectedNftItem?.value?.hex || '')}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-slate-400">Contract:</span>
                           <span className="hidden md:block text-white text-xs break-all">{selectedNftItem.asset_identifier}</span>
                           <span className="block md:hidden text-white text-xs break-all">{`${selectedNftItem.asset_identifier.slice(0, 4)}...${selectedNftItem.asset_identifier.slice(-10)}`}</span>
                        </div>
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label htmlFor="tokenId" className="text-slate-300">
                        Token ID
                     </Label>
                     <Input
                        id="tokenId"
                        value={tokenId}
                        onChange={(e) => onTokenIdChange(e.target.value)}
                        placeholder="123"
                        disabled={true} // Token ID is auto-filled based on selected NFT
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 hover:bg-slate-600 hover:border-slate-500"
                     />
                  </div>

                  <div className="space-y-2">
                     <Label
                        htmlFor="contractAddress"
                        className="text-slate-300"
                     >
                        Contract Address
                     </Label>
                     <Input
                        id="contractAddress"
                        value={contractAddress}
                        onChange={(e) =>
                           onContractAddressChange(e.target.value)
                        }
                        placeholder="SP1ABC...XYZ123.nft-contract"
                        disabled={true} // Contract address is auto-filled based on selected NFT
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 hover:bg-slate-600 hover:border-slate-500"
                     />
                  </div>
               </div>
            </>
         ) : (
            <div className="text-center py-8">
               {holdingsLoading || metadataLoading ? (
                  <div className="flex flex-col items-center gap-3">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                     <p className="text-slate-400 text-lg">Loading NFT collections...</p>
                  </div>
               ) : (
                  <p className="text-slate-400 text-lg">No NFTs available in this wallet.</p>
               )}
            </div>
         )}

         <div className="flex gap-3">
            <SecondaryButton className="flex-1" onClick={onBack}>
               Back
            </SecondaryButton>
            <PrimaryButton
               className="flex-1"
               disabled={!isValid || processedNftTokens.length === 0 || !selectedNftItem || holdingsLoading || metadataLoading}
               onClick={onNext}
            >
               {holdingsLoading || metadataLoading ? (
                  <div className="flex items-center gap-2">
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                     Processing...
                  </div>
               ) : (
                  'Next'
               )}
            </PrimaryButton>
         </div>
      </div>
   );
};

export default NFTSelectionStep;
