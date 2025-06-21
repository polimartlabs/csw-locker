import { useState, useEffect } from "react";
import { useSelectedWallet } from "@/hooks/useSelectedWallet";
import { useBlockchainService } from "@/hooks/useBlockchainService";
import { TransactionParams } from "@/services/blockchainService";
import { useToast } from "@/hooks/use-toast";

type WizardStep = "assetType" | "assetDetails" | "recipient" | "summary";

export const useSendAssetsWizard = () => {
   const [currentStep, setCurrentStep] = useState<WizardStep>("assetType");
   const [amount, setAmount] = useState("");
   const [recipient, setRecipient] = useState("");
   const [asset, setAsset] = useState("");
   const [assetType, setAssetType] = useState<"token" | "nft">("token");
   const [tokenId, setTokenId] = useState("");
   const [contractAddress, setContractAddress] = useState("");

   // console.log({
   //    asset,
   //    assetType,
   //    tokenId,
   //    contractAddress,
   //    currentStep,
   // });

   const { selectedWallet } = useSelectedWallet();
   const {
      sendTransaction,
      loadRecentData,
      recipients,
      isLoading,
      isDemoMode,
   } = useBlockchainService();
   const { toast } = useToast();

   useEffect(() => {
      if (selectedWallet?.address) {
         loadRecentData(selectedWallet.address);
      }
   }, [selectedWallet?.address, loadRecentData]);

   const handleAssetTypeChange = (type: "token" | "nft") => {
      setAssetType(type);
      setAsset("");
      setAmount("");
      setTokenId("");
      setContractAddress("");
   };

   const resetForm = () => {
      setCurrentStep("assetType");
      setAmount("");
      setRecipient("");
      setAsset("");
      setTokenId("");
      setContractAddress("");
   };

   const handleSendTransaction = async () => {
      if (!selectedWallet) return;

      const transactionParams: TransactionParams = {
         from: selectedWallet.address,
         to: recipient,
         amount: assetType === "nft" ? "1" : amount,
         asset: asset,
         assetType: assetType,
         ...(assetType === "nft" && { tokenId, contractAddress }),
      };

      try {
         const result = await sendTransaction(transactionParams);
         toast({
            title: isDemoMode ? "Demo Transaction Sent" : "Transaction Sent",
            description: `Transaction hash: ${result.txHash}`,
         });

         resetForm();
      } catch (error) {
         toast({
            title: "Transaction Failed",
            description: "Failed to send transaction. Please try again.",
            variant: "destructive",
         });
      }
   };

   return {
      // State
      currentStep,
      amount,
      recipient,
      asset,
      assetType,
      tokenId,
      contractAddress,
      selectedWallet,
      recipients,
      isLoading,
      isDemoMode,

      // Actions
      setCurrentStep,
      setAmount,
      setRecipient,
      setAsset,
      setTokenId,
      setContractAddress,
      handleAssetTypeChange,
      handleSendTransaction,
      resetForm,
   };
};
