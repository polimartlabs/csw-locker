import PrimaryButton from "@/components/ui/primary-button";
import UnifiedHeader from "@/components/UnifiedHeader";
import AddExistingWalletDialog from "@/components/wallet-selector/AddExistingWalletDialog";
import EmptyWalletState from "@/components/wallet-selector/EmptyWalletState";
import LoadingState from "@/components/wallet-selector/LoadingState";
import WalletCard from "@/components/wallet-selector/WalletCard";
import { useToast } from "@/hooks/use-toast";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import useGetRates from "@/hooks/useGetRates";
import { useSmartWalletContractService } from "@/hooks/useSmartWalletContractService";
import { useUserWalletConnection } from "@/hooks/useWalletConnection";
import { ContractInfoEntry, SmartWallet } from "@/services/interfaces";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const WalletSelector = () => {
  // State management
  const [walletsToShow, setWalletsToShow] = useState<
    (SmartWallet & ContractInfoEntry)[]
  >([]);
  const [importedWallets, setImportedWallets] = useState<
    (SmartWallet & ContractInfoEntry)[]
  >([]);

  // Hooks
  const { userData } = useUserWalletConnection();
  const {
    deployedContracts,
    hasSmartWallets,
    hasExtensions,
    loading: deployedContractsLoading,
    error: deployedContractsError,
  } = useSmartWalletContractService(
    userData?.addresses.stx?.[0]?.address ||
      "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.demo-address"
  );
  const { stxBalance, loading: balanceLoading } = useAccountBalanceService(
    userData?.addresses.stx?.[0]?.address ||
      "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.demo-address"
  );
  const { loading: rateLoading, usdPrice } = useGetRates(".stx");
  const { toast } = useToast();

  // Update wallets to show
  useEffect(() => {
    setWalletsToShow([...deployedContracts, ...importedWallets]);
  }, [deployedContracts, importedWallets]);

  // Event handlers
  const handleWalletAdded = (newWallet: SmartWallet) => {
    const walletExists = [...importedWallets, ...walletsToShow].some(
      (wallet) => wallet.contractId === newWallet.contractId
    );

    if (walletExists) {
      toast({
        title: "Wallet Already Exists",
        description:
          "Smart wallet was not added due to same contractId's exists",
        variant: "destructive",
      });
      return;
    }

    // Transform the new wallet to include ContractInfoEntry properties
    const transformedWallet: SmartWallet & ContractInfoEntry = {
      ...newWallet,
      icon: "👤",
      description: "Imported smart wallet",
      isDeployed: true,
    };

    setImportedWallets((prev) => [...prev, transformedWallet]);
    toast({
      title: "Wallet Added",
      description: "Smart wallet has been added to your list successfully!",
    });
  };

  // Computed values
  const totalBalance = balanceLoading
    ? "0.0000"
    : Number(stxBalance?.balance ?? 0).toFixed(4);

  const usdValue = rateLoading
    ? "0.0000"
    : (Number(stxBalance?.balance ?? 0) * Number(usdPrice ?? 0)).toFixed(4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <UnifiedHeader
        variant="wallet-selector"
        totalBalance={totalBalance}
        usdValue={usdValue}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                <span className="hidden sm:inline">My Smart Wallets</span>
                <span className="sm:hidden">Smart Wallets</span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                <span className="hidden sm:inline">
                  Select a smart wallet to manage or create a new one.
                </span>
                <span className="sm:hidden">
                  Manage or create smart wallets.
                </span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <AddExistingWalletDialog onWalletAdded={handleWalletAdded} />
              <PrimaryButton asChild className="w-full sm:w-auto">
                <Link
                  to="/create-wallet"
                  className="flex items-center justify-center"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Create New Wallet</span>
                  <span className="sm:hidden">Create Wallet</span>
                </Link>
              </PrimaryButton>
            </div>
          </div>

          {deployedContractsLoading ? (
            <LoadingState />
          ) : !hasSmartWallets ? (
            <EmptyWalletState />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {walletsToShow
                  .filter((wallet) => !wallet.ext)
                  .map((wallet, index) => (
                    <WalletCard
                      key={`${wallet.contractId}-${index}`}
                      wallet={wallet}
                    />
                  ))}
              </div>

              {/* Extension Contracts Section */}
              <div className="mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      <span className="hidden sm:inline">
                        Extension Contracts
                      </span>
                      <span className="sm:hidden">Extensions</span>
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base">
                      <span className="hidden sm:inline">
                        Deployed extension contracts for enhanced functionality.
                      </span>
                      <span className="sm:hidden">
                        Enhanced functionality contracts.
                      </span>
                    </p>
                  </div>
                  {deployedContractsLoading && (
                    <div className="text-slate-400 text-sm">
                      Loading extensions...
                    </div>
                  )}
                </div>

                {deployedContractsError ? (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-400">
                      Error loading extension contracts:{" "}
                      {deployedContractsError}
                    </p>
                  </div>
                ) : !hasExtensions ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
                    <p className="text-slate-400">
                      No extension contracts found for this address.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deployedContracts
                      .filter((contract) => contract.ext)
                      .map((contract, index) => (
                        <div
                          key={`${contract.name}-${index}`}
                          className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-xl sm:text-2xl">
                              {(
                                contract as ContractInfoEntry & {
                                  icon?: string;
                                }
                              ).icon || "📦"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-white font-semibold text-sm sm:text-base truncate">
                                {contract.label}
                              </h3>
                              <p className="text-slate-400 text-xs sm:text-sm truncate">
                                {contract.name}
                              </p>
                            </div>
                          </div>
                          <p className="text-slate-300 text-xs sm:text-sm mb-3 line-clamp-2">
                            {(
                              contract as ContractInfoEntry & {
                                description?: string;
                              }
                            ).description ||
                              "Extension contract for enhanced functionality"}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-green-400 text-xs sm:text-sm font-medium">
                                ✓ Deployed
                              </span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs sm:text-sm">
                              <span className="text-green-400 font-medium">
                                {contract.stxHolding} STX
                              </span>
                              <span className="text-green-400 font-medium">
                                {contract.btcHolding} sBTC
                              </span>
                              {contract.extensions.length > 0 && (
                                <span className="text-blue-400 text-xs">
                                  {contract.extensions.length} ext
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletSelector;
