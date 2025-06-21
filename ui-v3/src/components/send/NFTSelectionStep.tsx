import PrimaryButton from "@/components/ui/primary-button";
import SecondaryButton from "@/components/ui/secondary-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

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
   const isValid = asset && tokenId && contractAddress;
   const [nftBalance, setNftBalance] = useState<
      { name: string; contractAddress: string; id: string }[]
   >([]);
   const [selectedNft, setSelectedNft] = useState<string>("");

   useEffect(() => {
      const fetchNftBalance = () => {
         // Simulate fetching NFT balance
         return [
            {
               name: "Cool NFT #123",
               contractAddress: "SP1ABC...XYZ123",
               id: "123",
            },
            {
               name: "oyeins.dev #153",
               contractAddress: "SP1DEF...XYZ456",
               id: "153",
            },
            {
               name: "Rare Collectible #456",
               contractAddress: "SP1GHI...XYZ789",
               id: "456",
            },
         ];
      };
      setNftBalance(fetchNftBalance());
   }, []);
   return (
      <div className="space-y-6">
         {nftBalance.length !== 0 ? (
            <>
               <h3 className="text-lg font-semibold text-white">
                  Select NFT Details
               </h3>

               <div className="space-y-2">
                  <Label htmlFor="nftAsset" className="text-slate-300">
                     Select NFT
                  </Label>
                  <Select
                     value={selectedNft}
                     onValueChange={(value) => {
                        setSelectedNft(value);
                        const nft = nftBalance.find(
                           (nft) => nft.contractAddress === value
                        );

                        if (!nft) return;
                        onAssetChange(nft.name);
                        onTokenIdChange(nft.id);
                        onContractAddressChange(nft.contractAddress);
                     }}
                     required={true}
                  >
                     <SelectTrigger className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500">
                        <SelectValue placeholder="Choose an NFT to send" />
                     </SelectTrigger>
                     <SelectContent className="bg-slate-700 border-slate-600">
                        {nftBalance.map((nft) => (
                           <SelectItem
                              value={`${nft.contractAddress}`}
                              key={nft.id}
                              className="text-white hover:bg-slate-600 focus:bg-slate-600"
                           >
                              {nft.name}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label htmlFor="tokenId" className="text-slate-300">
                        Token ID
                     </Label>
                     {
                        <Input
                           id="tokenId"
                           value={tokenId}
                           onChange={(e) => onTokenIdChange(e.target.value)}
                           placeholder="123"
                           disabled={true} // Token ID is auto-filled based on selected NFT
                           className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 hover:bg-slate-600 hover:border-slate-500"
                        />
                     }
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
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 hover:bg-slate-600 hover:border-slate-500"
                     />
                  </div>
               </div>

               <div className="flex gap-3">
                  <SecondaryButton className="flex-1" onClick={onBack}>
                     Back
                  </SecondaryButton>
                  <PrimaryButton
                     className="flex-1"
                     disabled={!isValid}
                     onClick={onNext}
                  >
                     Next
                  </PrimaryButton>
               </div>
            </>
         ) : (
            <p className="text-white text-lg font-semibold">
               No NFTs available in this wallet.
            </p>
         )}
      </div>
   );
};

export default NFTSelectionStep;
