
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useWalletConnection } from "./useWalletConnection";

interface SelectedWallet {
  id: string;
  name: string;
  contractId: string;
  balance: string;
  usdValue: string;
  address: string;
  extensions?: string[];
  isImported?: boolean;
}

export const useSelectedWallet = () => {
  const { walletId } = useParams();
  const { isDemoMode, walletData } = useWalletConnection();
  const [selectedWallet, setSelectedWallet] = useState<SelectedWallet | null>(null);

  useEffect(() => {
    // Handle special "demo" wallet ID
    if (walletId === "demo" || isDemoMode) {
      const demoWallet: SelectedWallet = {
        id: "demo",
        name: "Demo Bitcoin Locker",
        contractId: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.demo-bitcoin-locker",
        balance: "10,000.00 STX",
        usdValue: "$20,000.00",
        address: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
        extensions: ["Multi-sig", "Time-lock", "Treasury", "Stacking"]
      };
      setSelectedWallet(demoWallet);
    } else {
      // Check if this is an imported wallet by looking for imported wallet indicators
      const isImportedWallet = walletId?.includes('.') && walletId?.length > 20;
      
      const wallet: SelectedWallet = {
        id: walletId || "default-wallet",
        name: isImportedWallet ? "Imported Bitcoin Locker" : "Personal Locker",
        contractId: walletId || "SP1ABC...XYZ123.bitcoin-locker-v1",
        balance: isImportedWallet ? "0.00 STX" : "1,234.56 STX",
        usdValue: isImportedWallet ? "$0.00" : "$2,469.12",
        address: walletData?.addresses?.stx?.[0]?.address || walletId || "SP1ABC...XYZ123",
        extensions: isImportedWallet ? ["Multi-sig"] : ["Multi-sig", "Time-lock"],
        isImported: isImportedWallet
      };
      setSelectedWallet(wallet);
    }
  }, [walletId, isDemoMode, walletData]);

  const switchWallet = (walletId: string) => {
    // This would typically navigate to the new wallet or update the selected wallet
    console.log(`Switching to wallet: ${walletId}`);
  };

  return {
    selectedWallet,
    switchWallet,
    isLoading: !selectedWallet
  };
};
