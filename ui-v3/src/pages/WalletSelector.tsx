import { Button } from "@/components/ui/button";
import PrimaryButton from "@/components/ui/primary-button";
import { Plus, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useBlockchainService } from "@/hooks/useBlockchainService";
import { useEffect, useState } from "react";
import WalletSelectorHeader from "@/components/wallet-selector/WalletSelectorHeader";
import WalletCard from "@/components/wallet-selector/WalletCard";
import EmptyWalletState from "@/components/wallet-selector/EmptyWalletState";
import LoadingState from "@/components/wallet-selector/LoadingState";
import AddExistingWalletDialog from "@/components/wallet-selector/AddExistingWalletDialog";
import { SmartWallet, WalletType } from "@/services/smartWalletContractService";
import Notice from "@/components/wallet-selector/Notice";

const WalletSelector = () => {
  const [isDemoMode, setIsDemo] = useState<boolean>(true)
  const [walletsToShow, setWalletsToShow] = useState<SmartWallet[]>([]);
  const [importedWallets, setImportedWallets] = useState<SmartWallet[]>([]);
  const { walletData } = useWalletConnection();
  const { loadSmartWallets, smartWallets, isLoading } = useBlockchainService();

  useEffect(() => {
    const fetchWalletData = async () => {
      if (walletData?.addresses?.stx?.[0]?.address) {
        console.log('Fetching wallet data for:', walletData.addresses.stx[0].address);
        try {
          await loadSmartWallets(walletData.addresses.stx[0].address);
        } catch (error) {
          console.error('Failed to fetch wallet data:', error);
        }
      }
    };

    fetchWalletData();
  }, [isDemoMode, walletData, loadSmartWallets]);

  useEffect(() => {
    // Combine detected wallets with imported wallets
    const allWallets = [...smartWallets, ...importedWallets];
    setWalletsToShow(allWallets);
  }, [smartWallets, importedWallets]);

  const handleWalletAdded = (newWallet: SmartWallet) => {
    setImportedWallets(prev => [...prev, newWallet]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <WalletSelectorHeader
        totalBalance="1,234.56 STX"
        usdValue="$2,469.12"
      />

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                My Smart Wallets
              </h1>
              <p className="text-slate-400">
                Select a smart wallet to manage or create a new one.
              </p>
            </div>

            <div className="flex gap-3">
              <AddExistingWalletDialog
                onWalletAdded={handleWalletAdded}
                isDemoMode={isDemoMode}
              />
              <PrimaryButton asChild>
                <Link to="/create-wallet">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Wallet
                </Link>
              </PrimaryButton>
            </div>

          </div>

          {isLoading ? (
            <LoadingState />
          ) : walletsToShow.length === 0 ? (
            <EmptyWalletState />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {walletsToShow.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  isDemoMode={isDemoMode}
                />
              ))}
            </div>
          )}

          <Notice />
        </div>
      </div>
    </div>
  );
};

export default WalletSelector;
