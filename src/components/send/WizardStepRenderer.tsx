import AssetTypeSelector from "@/components/send/AssetTypeSelector";
import TokenSelectionStep from "@/components/send/TokenSelectionStep";
import NFTSelectionStep from "@/components/send/NFTSelectionStep";
import RecipientSelectionStep from "@/components/send/RecipientSelectionStep";
import TransactionSummaryStep from "@/components/send/TransactionSummaryStep";
import PrimaryButton from "@/components/ui/primary-button";
import { Toaster } from "../ui/toaster";
import { SmartWallet } from "@/services/interfaces";

type WizardStep = "assetType" | "assetDetails" | "recipient" | "summary";

interface SelectedWallet extends SmartWallet {
   address: string;
   isAdmin: boolean;
   isImported?: boolean;
}

interface WizardStepRendererProps {
   currentStep: WizardStep;
   assetType: "ft" | "nft";
   asset: string;
   amount: string;
   tokenId: string;
   contractAddress: string;
   recipient: string;
   selectedWallet: Partial<SelectedWallet> | null;
   recipients: any[];
   isLoading: boolean;
   onAssetTypeChange: (type: "ft" | "nft") => void;
   onAssetChange: (asset: string) => void;
   onAmountChange: (amount: string) => void;
   onTokenIdChange: (tokenId: string) => void;
   onContractAddressChange: (contractAddress: string) => void;
   onRecipientChange: (recipient: string) => void;
   onDecimalChange: (decimal: number) => void;
   onRemoveRecipient?: (address: string) => void;
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
   onDecimalChange,
   onRemoveRecipient,
   onStepChange,
   onSendTransaction,
}: WizardStepRendererProps) => {

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
         return assetType === "ft" ? (
            <>
               <TokenSelectionStep
                  asset={asset}
                  amount={amount}
                  contractAddress={contractAddress}
                  onAssetChange={onAssetChange}
                  onContractAddressChange={onContractAddressChange}
                  onAmountChange={onAmountChange}
                  onDecimalChange={onDecimalChange}
                  onNext={() => {
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
               onRemoveRecipient={onRemoveRecipient}
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
