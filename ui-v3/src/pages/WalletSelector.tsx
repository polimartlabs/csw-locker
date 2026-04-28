import PrimaryButton from "@/components/ui/primary-button";
import { Bitcoin, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { isOnboardingComplete } from "@/lib/onboardingStorage";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useSmartWalletContractService } from "@/hooks/useSmartWalletContractService";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import WalletSelectorHeader from "@/components/wallet-selector/WalletSelectorHeader";
import WalletCard from "@/components/wallet-selector/WalletCard";
import BtcVaultCard from "@/components/wallet-selector/BtcVaultCard";
import EmptyWalletState from "@/components/wallet-selector/EmptyWalletState";
import LoadingState from "@/components/wallet-selector/LoadingState";
import AddExistingWalletDialog from "@/components/wallet-selector/AddExistingWalletDialog";
import { SmartWallet, ContractInfoEntry } from "@/services/interfaces";
import Notice from "@/components/wallet-selector/Notice";
import { useToast } from "@/hooks/use-toast";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import { formatNumber } from "@/utils/numbers";
import { MockAccountBalanceService } from "@/services/mocks/mockAccountBalanceService";
import { MockSmartWalletContractService } from "@/services/mocks/mockSmartWalletContractService";
import { BTC_VAULTS_CHANGED_EVENT, loadBtcVaults, type BtcVaultRecord } from "@/lib/btcVaultStorage";

const WalletSelector = () => {
  const navigate = useNavigate();
  // State management
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);
  const [walletsToShow, setWalletsToShow] = useState<(SmartWallet & ContractInfoEntry)[]>([]);
  const [importedWallets, setImportedWallets] = useState<(SmartWallet & ContractInfoEntry)[]>([]);
  const [demoBalance, setDemoBalance] = useState<any>(null);
  const [demoWallets, setDemoWallets] = useState<(SmartWallet & ContractInfoEntry)[]>([]);
  const [btcVaults, setBtcVaults] = useState<BtcVaultRecord[]>(() =>
    typeof window !== "undefined" ? loadBtcVaults() : []
  );

  // Hooks
  const { walletData, isWalletConnected } = useWalletConnection();
  const { deployedContracts, deployedContractCount, hasSmartWallets, hasExtensions, loading: deployedContractsLoading, error: deployedContractsError } = useSmartWalletContractService(walletData?.addresses.stx?.[0]?.address);
  const { stxBalance, loading: balanceLoading } = useAccountBalanceService(walletData?.addresses.stx?.[0]?.address);
  const { stxUsd, loading: pricesLoading } = useAssetPrices();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Constants
  const DEMO_ADDRESS = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.demo-address";

  // Helper function to transform mock wallet data
  const transformMockWallet = (wallet: any): SmartWallet & ContractInfoEntry => ({
    contractId: wallet.contractId,
    name: wallet.name,
    label: wallet.name,
    id: wallet.id || Math.random(), // Generate random number if no id
    ext: false,
    stxHolding: wallet.balance,
    btcHolding: 0,
    extensions: wallet.extensions || [],
    createdAt: wallet.createdAt || new Date().toISOString().split('T')[0],
    icon: wallet.icon || '👤',
    description: wallet.description || 'Demo smart wallet',
    isDeployed: true
  });

  // Load demo data when in demo mode
  const loadDemoData = async () => {
    try {
      const mockBalanceService = new MockAccountBalanceService();
      const mockWalletService = new MockSmartWalletContractService();

      const [balance, wallets] = await Promise.all([
        mockBalanceService.getAccountBalances(DEMO_ADDRESS),
        mockWalletService.getSmartWallets(DEMO_ADDRESS)
      ]);

      setDemoBalance(balance);
      setDemoWallets(wallets.map(transformMockWallet) as (SmartWallet & ContractInfoEntry)[]);
    } catch (error) {
      console.error('Failed to load demo data:', error);
    }
  };

  // Effects
  const demoRequested = searchParams.get('demo') === 'true';
  const realWallets = [...deployedContracts, ...importedWallets];
  const hasRealSmartWallets = realWallets.some((wallet) => !wallet.ext);
  const effectiveDemoMode = demoRequested && !hasRealSmartWallets && btcVaults.length === 0;

  useEffect(() => {
    if (isWalletConnected && !isOnboardingComplete()) {
      navigate("/onboarding", { replace: true });
    }
  }, [isWalletConnected, navigate]);

  useEffect(() => {
    if (effectiveDemoMode) {
      loadDemoData();
    }
  }, [effectiveDemoMode]);

  useEffect(() => {
    const sync = () => setBtcVaults(loadBtcVaults());
    window.addEventListener(BTC_VAULTS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BTC_VAULTS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);



  // Update wallets to show based on mode
  useEffect(() => {
    if (effectiveDemoMode) {
      setWalletsToShow(demoWallets);
    } else {
      setWalletsToShow(realWallets);
    }
  }, [realWallets, demoWallets, effectiveDemoMode]);

  // Event handlers
  const handleWalletAdded = (newWallet: SmartWallet) => {
    const walletExists = [...importedWallets, ...walletsToShow].some(
      wallet => wallet.contractId === newWallet.contractId
    );

    if (walletExists) {
      toast({
        title: "Wallet Already Exists",
        description: "Smart wallet was not added due to same contractId's exists",
        variant: 'destructive'
      });
      return;
    }

    // Transform the new wallet to include ContractInfoEntry properties
    const transformedWallet: SmartWallet & ContractInfoEntry = {
      ...newWallet,
      icon: '👤',
      description: 'Imported smart wallet',
      isDeployed: true
    };

    setImportedWallets(prev => [...prev, transformedWallet]);
    toast({
      title: "Wallet Added",
      description: "Smart wallet has been added to your list successfully!",
    });
  };

  // Computed values
  const totalBalance = effectiveDemoMode
    ? (demoBalance?.stx?.balance ?? '0.0000')
    : (balanceLoading ? '0.0000' : Number(stxBalance?.balance ?? 0).toFixed(4));

  const stxAddr = walletData?.addresses?.stx?.[0]?.address ?? null;
  const stxUsdLabel =
    effectiveDemoMode
      ? demoBalance?.stx && stxUsd
        ? `$${formatNumber(Number(demoBalance.stx.balance) * stxUsd, 2)}`
        : "—"
      : pricesLoading
        ? "—"
        : stxBalance && stxUsd
          ? `$${formatNumber(Number(stxBalance.balance) * stxUsd, 2)}`
          : "—";

  const smartNonExtCount = effectiveDemoMode
    ? demoWallets.filter((w) => !w.ext).length
    : walletsToShow.filter((w) => !w.ext).length;
  const hasAnyWallet = smartNonExtCount > 0 || btcVaults.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <WalletSelectorHeader stxBalance={totalBalance} stxUsd={stxUsdLabel} stxAddress={stxAddr} />
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

            <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
              <AddExistingWalletDialog
                onWalletAdded={handleWalletAdded}
                isDemoMode={effectiveDemoMode}
              />
              <PrimaryButton asChild className="bg-amber-600 hover:bg-amber-500 text-white">
                <Link to="/create-btc-vault">
                  <Bitcoin className="mr-2 h-4 w-4" />
                  Create BTC vault
                </Link>
              </PrimaryButton>
              <PrimaryButton asChild>
                <Link to="/create-wallet">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Wallet
                </Link>
              </PrimaryButton>
            </div>

          </div>

          {effectiveDemoMode && <Notice />}

          {deployedContractsLoading && !effectiveDemoMode
            ? (
              <LoadingState />
            )
            : !hasAnyWallet
              ? (<EmptyWalletState />)
              : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {walletsToShow
                      .filter(wallet => !wallet.ext)
                      .map((wallet, index) => (
                        <WalletCard
                          key={`${wallet.contractId}-${index}`}
                          wallet={wallet}
                          isDemoMode={effectiveDemoMode}
                        />
                      ))}
                    {btcVaults.map((vault) => (
                      <BtcVaultCard key={vault.id} vault={vault} />
                    ))}
                  </div>

                  {/* Extension Contracts Section */}
                  {!effectiveDemoMode && (
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">
                            Extension Contracts
                          </h2>
                          <p className="text-slate-400">
                            Deployed extension contracts for enhanced functionality.
                          </p>
                        </div>
                        {deployedContractsLoading && (
                          <div className="text-slate-400">Loading extensions...</div>
                        )}
                      </div>

                      {deployedContractsError ? (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                          <p className="text-red-400">Error loading extension contracts: {deployedContractsError}</p>
                        </div>
                      ) : !hasExtensions
                        ? (
                          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
                            <p className="text-slate-400">No extension contracts found for this address.</p>
                          </div>
                        )
                        : (
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {deployedContracts
                              .filter(contract => contract.ext)
                              .map((contract, index) => (
                                <div key={`${contract.name}-${index}`} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">{(contract as any).icon || '📦'}</span>
                                    <div>
                                      <h3 className="text-white font-semibold">{contract.label}</h3>
                                      <p className="text-slate-400 text-sm">{contract.name}</p>
                                    </div>
                                  </div>
                                  <p className="text-slate-300 text-sm mb-3">{(contract as any).description || 'Extension contract for enhanced functionality'}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-green-400 text-sm font-medium">
                                      ✓ Deployed
                                    </span>
                                    <span className="text-green-400 text-sm font-medium">
                                      {contract.stxHolding} STX
                                    </span>
                                    <span className="text-green-400 text-sm font-medium">
                                      {contract.btcHolding} sBTC
                                    </span>
                                    {contract.extensions.length > 0 && (
                                      <span className="text-blue-400 text-xs">
                                        {contract.extensions.length} extensions
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                    </div>
                  )}
                </>
              )}
        </div>
      </div>
    </div>
  );
};

export default WalletSelector;