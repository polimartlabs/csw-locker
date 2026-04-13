import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import PrimaryButton from "@/components/ui/primary-button";
import UnifiedHeader from "@/components/UnifiedHeader";
import { getVerifiedContracts, type ContractType } from "@/data/walletTypes";
import { useTxServices } from "@/hooks/useTxServices";
import { useUserWalletConnection } from "@/hooks/useWalletConnection";
import { getClientConfig } from "@/utils/chain-config";
import axios from "axios";
import { Check, Clock, Plus, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

const CreateWallet = () => {
  const { userData, isWalletConnected, connectWallet, isConnecting } = useUserWalletConnection()
  const { deployContract, isLoading, error } = useTxServices()
  const [selectedContract, setSelectedContract] = useState<ContractType>()
  const [isCreating, setIsCreating] = useState(false)
  const [verifiedContracts, setVerifiedContracts] = useState<ContractType[]>([]);

  const userAddress = userData?.addresses?.stx[0]?.address

  const handleExtensionToggle = (contract: ContractType) => {
    setSelectedContract(contract)
  };

  const handleCreateWallet = async () => {
    const { network } = getClientConfig(userAddress);

    if (!selectedContract || !network) {
      return;
    }

    setIsCreating(true);

    try {
      // Fetch the Clarity code from the contract source
      const clarityCode: string = (await axios.get(`/clarity/${network}/${selectedContract.src}`)).data;

      // Deploy the contract using the useTxServices hook
      await deployContract({
        name: selectedContract.name,
        clarityCode: clarityCode,
        clarityVersion: 3
      });

      // Optionally navigate to the new wallet or show success message
    } catch (error) {
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    async function init() {
      if (!userAddress) return;
      const vContracts = await getVerifiedContracts(userAddress)
      setVerifiedContracts(vContracts)

      const smartWalletContracts = vContracts.filter(c => c.name === 'smart-wallet')
      if (smartWalletContracts.length > 0 && !smartWalletContracts[0].isDeployed) {
        setSelectedContract(smartWalletContracts[0])
      }
    }
    init()
  }, [userAddress])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <UnifiedHeader variant="default" />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Smart Wallet</h1>
            <p className="text-slate-400">Deploy a new smart contract wallet with custom extensions.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Wallet Configuration */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Wallet className="mr-2 h-5 w-5 text-purple-400" />
                  Select Wallet Type
                </CardTitle>
                <p className="text-slate-400 text-sm">Choose a wallet contract to deploy</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verifiedContracts.filter((contract) => !contract.ext).map((contract) => (
                    <div
                      key={contract.name}
                      className={`p-4 rounded-lg border transition-all duration-200 ${contract.isDeployed
                        ? "border-green-600/50 bg-green-900/20 cursor-not-allowed"
                        : contract.comingSoon
                          ? "border-slate-600 bg-slate-700/20 opacity-60 cursor-not-allowed"
                          : selectedContract?.name === contract.name
                            ? "border-purple-600/50 bg-purple-600/10 cursor-pointer hover:bg-purple-600/15"
                            : "border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/40 cursor-pointer"
                        }`}
                      onClick={contract.isDeployed || contract.comingSoon ? undefined : () => handleExtensionToggle(contract)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {contract.isDeployed ? (
                            <div className="w-5 h-5 rounded-full bg-green-600/20 border border-green-600/50 flex items-center justify-center">
                              <Check className="h-3 w-3 text-green-400" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={selectedContract?.name === contract.name}
                              disabled={contract.comingSoon}
                              onChange={() => handleExtensionToggle(contract)}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{contract.icon}</span>
                              <div>
                                <span className={`font-medium block ${contract.isDeployed
                                  ? 'text-green-300'
                                  : contract.comingSoon
                                    ? 'text-slate-400'
                                    : 'text-white'
                                  }`}>
                                  {contract.label || contract.name}
                                </span>
                                <span className={`text-xs font-mono ${contract.isDeployed
                                  ? 'text-green-400/70'
                                  : contract.comingSoon
                                    ? 'text-slate-500'
                                    : 'text-slate-400'
                                  }`}>
                                  {contract.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {contract.isDeployed && (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-green-600/20 border border-green-600/30 rounded-full">
                                  <Check className="h-3 w-3 text-green-400" />
                                  <span className="text-xs text-green-300 font-medium">Deployed</span>
                                </div>
                              )}
                              {contract.comingSoon && (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-600/50 rounded-full">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span className="text-xs text-slate-400">Coming Soon</span>
                                </div>
                              )}
                              {selectedContract?.name === contract.name && !contract.comingSoon && !contract.isDeployed && (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-purple-600/20 border border-purple-600/30 rounded-full">
                                  <Check className="h-3 w-3 text-purple-400" />
                                  <span className="text-xs text-purple-300 font-medium">Selected</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className={`text-sm mt-2 ${contract.isDeployed
                            ? 'text-green-200/80'
                            : contract.comingSoon
                              ? 'text-slate-500'
                              : 'text-slate-400'
                            }`}>
                            {contract.description}
                          </p>
                          {contract.isDeployed && (
                            <p className="text-xs text-green-400/70 mt-1">
                              This wallet contract is already deployed and active.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="pt-4">
                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                      <p className="text-red-400 text-sm">
                        <strong>Deployment Error:</strong> {error}
                      </p>
                    </div>
                  </div>
                )}

                {!isWalletConnected && (
                  <div className="pt-4">
                    <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-400 text-sm font-medium">
                            Wallet Not Connected
                          </p>
                          <p className="text-yellow-300 text-xs mt-1">
                            Connect your wallet to deploy smart contracts
                          </p>
                        </div>
                        <Wallet className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                    <PrimaryButton
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className="w-full"
                    >
                      {isConnecting ? (
                        "Connecting..."
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4" />
                          Connect Wallet
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                )}

                {isWalletConnected && (
                  <div className="pt-4 space-y-3">
                    {selectedContract?.isDeployed && (
                      <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3">
                        <p className="text-green-300 text-sm font-medium">
                          Contract Already Deployed
                        </p>
                        <p className="text-green-200/80 text-xs mt-1">
                          This wallet contract is already active and cannot be deployed again.
                        </p>
                      </div>
                    )}
                    <PrimaryButton
                      onClick={handleCreateWallet}
                      disabled={isCreating || isLoading || !selectedContract || selectedContract.isDeployed}
                      className="w-full"
                    >
                      {isCreating || isLoading ? (
                        "Creating Wallet..."
                      ) : selectedContract?.isDeployed ? (
                        "Contract Already Deployed"
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Deploy Smart Wallet
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extensions Selection */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Select Extensions</CardTitle>
                <p className="text-slate-400 text-sm">Choose extensions to add to your smart wallet</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verifiedContracts.filter((contract) => contract.ext).map((contract) => (
                    <div
                      key={contract.name}
                      className={`p-4 rounded-lg border transition-all duration-200 ${contract.isDeployed
                        ? "border-green-600/50 bg-green-900/20 cursor-not-allowed"
                        : contract.comingSoon
                          ? "border-slate-600 bg-slate-700/20 opacity-60 cursor-not-allowed"
                          : selectedContract?.name === contract.name
                            ? "border-purple-600/50 bg-purple-600/10 cursor-pointer hover:bg-purple-600/15"
                            : "border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/40 cursor-pointer"
                        }`}
                      onClick={contract.isDeployed || contract.comingSoon ? undefined : () => handleExtensionToggle(contract)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {contract.isDeployed ? (
                            <div className="w-5 h-5 rounded-full bg-green-600/20 border border-green-600/50 flex items-center justify-center">
                              <Check className="h-3 w-3 text-green-400" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={selectedContract?.name === contract.name}
                              disabled={contract.comingSoon}
                              onChange={() => handleExtensionToggle(contract)}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{contract.icon}</span>
                              <span className={`font-medium ${contract.isDeployed
                                ? 'text-green-300'
                                : contract.comingSoon
                                  ? 'text-slate-400'
                                  : 'text-white'
                                }`}>
                                {contract.label || contract.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {contract.isDeployed && (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-green-600/20 border border-green-600/30 rounded-full">
                                  <Check className="h-3 w-3 text-green-400" />
                                  <span className="text-xs text-green-300 font-medium">Deployed</span>
                                </div>
                              )}
                              {contract.comingSoon && (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-600/50 rounded-full">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span className="text-xs text-slate-400">Coming Soon</span>
                                </div>
                              )}
                              {selectedContract?.name === contract.name && !contract.comingSoon && !contract.isDeployed && (
                                <div className="flex items-center space-x-1 px-2 py-1 bg-purple-600/20 border border-purple-600/30 rounded-full">
                                  <Check className="h-3 w-3 text-purple-400" />
                                  <span className="text-xs text-purple-300 font-medium">Selected</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className={`text-sm mt-2 ${contract.isDeployed
                            ? 'text-green-200/80'
                            : contract.comingSoon
                              ? 'text-slate-500'
                              : 'text-slate-400'
                            }`}>
                            {contract.description}
                          </p>
                          {contract.isDeployed && (
                            <p className="text-xs text-green-400/70 mt-1">
                              This extension is already deployed and active on your wallet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateWallet;
