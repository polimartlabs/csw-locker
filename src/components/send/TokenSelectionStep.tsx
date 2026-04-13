import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import PrimaryButton from "@/components/ui/primary-button";
import SecondaryButton from "@/components/ui/secondary-button";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { AccountBalanceService } from "@/services/accountBalanceService";
import { getClientConfig } from "@/utils/chain-config";

interface TokenSelectionStepProps {
   asset: string;
   amount: string;
   contractAddress: string;
   onAssetChange: (asset: string) => void;
   onContractAddressChange: (address: string) => void;
   onAmountChange: (amount: string) => void;
   onDecimalChange: (decimal: number) => void;
   onNext: () => void;
   onBack: () => void;
}

const TokenSelectionStep = ({
   asset,
   amount,
   contractAddress,
   onAssetChange,
   onContractAddressChange,
   onAmountChange,
   onDecimalChange,
   onNext,
   onBack,
}: TokenSelectionStepProps) => {
   const { walletId } = useParams<{ walletId: `${string}.${string}` }>();

   // Use the hook to get FT balances and metadata
   const { ftBalance, ftMetadata, loading } = useAccountBalanceService(walletId);

   // State for processed tokens with metadata
   const [processedFtTokens, setProcessedFtTokens] = useState<any[]>([]);
   const [metadataLoading, setMetadataLoading] = useState(false);

   // Fetch metadata with delays to avoid CORS errors
   useEffect(() => {
      if (ftBalance.length === 0) {
         setProcessedFtTokens([]);
         return;
      }

      const fetchMetadataWithDelays = async () => {
         setMetadataLoading(true);
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
                  decimal: ft.asset_identifier.split("::")[0] === ".stacks" ? 6 : existingMetadata?.decimals || 0
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
                     decimal: ft.asset_identifier.split("::")[0] === ".stacks" ? 6 : existingMetadata?.decimals || 0
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
                     decimal: ft.asset_identifier.split("::")[0] === ".stacks" ? 6 : existingMetadata?.decimals || 0
                  });
               }
            }
         }

         setProcessedFtTokens(processedTokens);
         setMetadataLoading(false);
      };

      fetchMetadataWithDelays();
   }, [ftBalance, ftMetadata, walletId]);

   // Find the selected FT token
   const selectedFt = processedFtTokens.find(ft => ft.symbol === asset);

   // Validation logic
   const amountNum = parseFloat(amount) || 0;
   const selectedBalance = parseFloat(selectedFt?.balance || "0");
   const isValid = asset && amount && amountNum > 0 && amountNum <= selectedBalance;
   const isLoading = loading || metadataLoading;

   return (
      <div className="space-y-6">
         <h3 className="text-lg font-semibold text-white">
            Select Token & Amount
         </h3>

         {processedFtTokens.length > 0 ? (
            <>
               <div className="space-y-2">
                  <Label htmlFor="asset" className="text-slate-300">
                     Select Token
                  </Label>
                  <Select
                     value={asset}
                     onValueChange={(value) => {
                        const ft = processedFtTokens.find((ft) => ft.symbol === value);

                        if (!ft) return;

                        onDecimalChange(ft.decimal);
                        onContractAddressChange(ft.asset_identifier);
                        onAssetChange(value);
                     }}
                     required
                     disabled={isLoading}
                  >
                     <SelectTrigger className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500">
                        <SelectValue placeholder={isLoading ? "Loading tokens..." : "Choose a token to send"} />
                     </SelectTrigger>
                     <SelectContent className="bg-slate-700 border-slate-600">
                        {processedFtTokens.map((ft) => (
                           <SelectItem
                              value={ft.symbol}
                              key={ft.symbol}
                              className="text-white hover:bg-slate-600 focus:bg-slate-600"
                           >
                              <div className="flex items-center gap-3">
                                 <img src={ft.symbol === 'stx' ? '/stx.png' : ft.icon} alt={ft.name} className="w-6 h-6 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                 <div className="flex-1">
                                    <div className="font-medium text-left">{ft.name} {`(${ft.symbol})`}</div>
                                    <div className="text-sm text-slate-400 text-left">
                                       {ft.balance || "0"} available
                                    </div>
                                 </div>
                              </div>
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="amount" className="text-slate-300">
                     Amount
                  </Label>
                  <div className="relative">
                     <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => onAmountChange(e.target.value)}
                        placeholder="0.00"
                        disabled={isLoading}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-16 hover:bg-slate-600 hover:border-slate-500"
                     />
                     <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 hover:bg-slate-600"
                        onClick={() =>
                           onAmountChange(selectedFt?.balance || "0")
                        }
                     >
                        MAX
                     </Button>
                  </div>
               </div>
            </>
         ) : (
            <div className="text-center py-8">
               <p className="text-slate-400 text-lg">
                  {loading ? "Loading tokens..." : "No tokens available in this wallet."}
               </p>
            </div>
         )}

         {/* Validation Messages */}
         {!isValid && amount && (
            <div className="text-sm text-red-400 space-y-1">
               {!asset && <p>• Please select a token</p>}
               {asset && amountNum <= 0 && <p>• Amount must be greater than 0</p>}
               {asset && amountNum > selectedBalance && (
                  <p>• Amount cannot exceed available balance ({selectedBalance} {selectedFt?.symbol || ""})</p>
               )}
            </div>
         )}

         <div className="flex gap-3">
            <SecondaryButton className="flex-1" onClick={onBack}>
               Back
            </SecondaryButton>
            <PrimaryButton
               className="flex-1"
               disabled={!isValid || processedFtTokens.length === 0}
               onClick={onNext}
            >
               Next
            </PrimaryButton>
         </div>
      </div>
   );
};

export default TokenSelectionStep;
