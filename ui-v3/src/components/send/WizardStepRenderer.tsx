import AssetTypeSelector from "@/components/send/AssetTypeSelector";
import TokenSelectionStep from "@/components/send/TokenSelectionStep";
import NFTSelectionStep from "@/components/send/NFTSelectionStep";
import RecipientSelectionStep from "@/components/send/RecipientSelectionStep";
import TransactionSummaryStep from "@/components/send/TransactionSummaryStep";
import PrimaryButton from "@/components/ui/primary-button";
import { Recipient } from "@/services/blockchainService";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "../ui/toaster";

type WizardStep = "assetType" | "assetDetails" | "recipient" | "summary";

interface SelectedWallet {
   address: string;
   balance: string;
}

interface WizardStepRendererProps {
   currentStep: WizardStep;
   assetType: "token" | "nft";
   asset: string;
   amount: string;
   tokenId: string;
   contractAddress: string;
   recipient: string;
   selectedWallet: SelectedWallet | null;
   recipients: Recipient[];
   isLoading: boolean;
   onAssetTypeChange: (type: "token" | "nft") => void;
   onAssetChange: (asset: string) => void;
   onAmountChange: (amount: string) => void;
   onTokenIdChange: (tokenId: string) => void;
   onContractAddressChange: (contractAddress: string) => void;
   onRecipientChange: (recipient: string) => void;
   onStepChange: (step: WizardStep) => void;
   onSendTransaction: () => void;
}

const WizardStepRenderer = ({
   currentStep,
   assetType,
   asset,
   amount,
   tokenId,
   contractAddress,
   recipient,
   selectedWallet,
   recipients,
   isLoading,
   onAssetTypeChange,
   onAssetChange,
   onAmountChange,
   onTokenIdChange,
   onContractAddressChange,
   onRecipientChange,
   onStepChange,
   onSendTransaction,
}: WizardStepRendererProps) => {
   const { toast } = useToast();
   switch (currentStep) {
      case "assetType":
         return (
            <div className="space-y-6">
               <AssetTypeSelector
                  assetType={assetType}
                  onAssetTypeChange={onAssetTypeChange}
               />
               <div className="flex justify-end">
                  <PrimaryButton
                     className="px-6 py-2 h-auto font-medium"
                     onClick={() => onStepChange("assetDetails")}
                  >
                     Next
                  </PrimaryButton>
               </div>
            </div>
         );

      case "assetDetails":
         return assetType === "token" ? (
            <>
               <TokenSelectionStep
                  asset={asset}
                  amount={amount}
                  selectedWallet={selectedWallet}
                  onAssetChange={onAssetChange}
                  onAmountChange={onAmountChange}
                  onNext={() => {
                     if (!asset) {
                        toast({
                           title: "No selected token",
                           description: "Select a token to send",
                           variant: "destructive",
                        });
                        return;
                     }
                     onStepChange("recipient");
                  }}
                  onBack={() => onStepChange("assetType")}
               />
               <Toaster />
            </>
         ) : (
            <>
               <NFTSelectionStep
                  asset={asset}
                  tokenId={tokenId}
                  contractAddress={contractAddress}
                  onAssetChange={onAssetChange}
                  onTokenIdChange={onTokenIdChange}
                  onContractAddressChange={onContractAddressChange}
                  onNext={() => {
                     if (!asset) {
                        toast({
                           title: "No selected NFT",
                           description: "Select an NFT to send",
                           variant: "destructive",
                        });
                        return;
                     }
                     onStepChange("recipient");
                  }}
                  onBack={() => onStepChange("assetType")}
               />
               <Toaster />
            </>
         );

      case "recipient":
         return (
            <RecipientSelectionStep
               recipient={recipient}
               recipients={recipients}
               onRecipientChange={onRecipientChange}
               onNext={() => onStepChange("summary")}
               onBack={() => onStepChange("assetDetails")}
            />
         );

      case "summary":
         return (
            <TransactionSummaryStep
               assetType={assetType}
               asset={asset}
               amount={amount}
               tokenId={tokenId}
               contractAddress={contractAddress}
               recipient={recipient}
               selectedWallet={selectedWallet}
               isLoading={isLoading}
               onSend={onSendTransaction}
               onBack={() => onStepChange("recipient")}
            />
         );
   }
};

export default WizardStepRenderer;
