import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useSendAssetsWizard } from "@/hooks/useSendAssetsWizard";
import { getStepTitle } from "@/utils/sendAssetsUtils";
import WizardStepRenderer from "@/components/send/WizardStepRenderer";
import BtcSendPanel from "@/components/send/BtcSendPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, Navigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getBtcVault } from "@/lib/btcVaultStorage";

const SendAssets = () => {
  const { walletId: routeWalletId } = useParams<{ walletId: string }>();
  const vaultFromRoute = routeWalletId ? getBtcVault(routeWalletId) : null;
  const {
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
    setCurrentStep,
    setAmount,
    setRecipient,
    setAsset,
    setTokenId,
    setContractAddress,
    setDecimal,
    handleAssetTypeChange,
    handleRemoveRecipient,
    handleSendTransaction,
  } = useSendAssetsWizard();

  const tabListClass = cn(
    "grid w-full h-12 grid-cols-2 gap-0 p-1 rounded-lg",
    "bg-slate-900/80 border border-slate-600/80 shadow-sm"
  );
  const tabTriggerClass = cn(
    "rounded-md text-sm font-semibold text-slate-400 transition-colors",
    "data-[state=active]:bg-purple-600/55 data-[state=active]:text-white data-[state=active]:shadow-inner",
    "data-[state=active]:text-white",
    "focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
  );
  const tabTriggerBtc = cn(
    tabTriggerClass,
    "data-[state=active]:bg-amber-600/45 data-[state=active]:text-amber-50"
  );

  if (vaultFromRoute) return <Navigate to={`/btc-vault/${vaultFromRoute.id}/send`} replace />;

  return (
    <WalletLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Send</h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
            Send from your smart contract on <span className="text-slate-200">Stacks</span>, or move{" "}
            <span className="text-slate-200">native Bitcoin (L1)</span> from the address you connect in the header.
          </p>
          {selectedWallet?.address && routeWalletId && (
            <p className="text-xs sm:text-sm text-purple-200/90 mt-3 font-mono break-all sm:break-words sm:truncate max-w-full bg-slate-800/50 border border-slate-700/80 rounded-md px-2 py-1.5">
              <span className="text-slate-500 font-sans not-italic mr-2">From contract</span>
              {selectedWallet.address}
            </p>
          )}
        </div>

        {!routeWalletId && (
          <div
            className="rounded-lg border border-amber-500/30 bg-amber-950/25 px-3 py-3 text-sm text-amber-50/95 leading-relaxed"
            role="status"
          >
            <span className="font-medium text-amber-100">Stacks send needs a smart wallet in the URL.</span>{" "}
            <Link to="/wallet-selector" className="text-purple-300 font-semibold hover:underline">
              Select a smart wallet
            </Link>{" "}
            first, or use the <strong className="text-amber-100">Bitcoin</strong> tab for L1 only.
          </div>
        )}

        <Tabs defaultValue="stacks" className="w-full">
          <TabsList className={tabListClass}>
            <TabsTrigger value="stacks" className={tabTriggerClass}>
              Stacks
            </TabsTrigger>
            <TabsTrigger value="bitcoin" className={tabTriggerBtc}>
              Bitcoin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stacks" className="mt-5 sm:mt-6 space-y-4 outline-none">
            {routeWalletId ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg sm:text-xl text-white flex items-center gap-2">
                  <Send className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 shrink-0" />
                  {getStepTitle(currentStep, assetType)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WizardStepRenderer
                  currentStep={currentStep}
                  assetType={assetType}
                  asset={asset}
                  amount={amount}
                  tokenId={tokenId}
                  contractAddress={contractAddress}
                  recipient={recipient}
                  selectedWallet={selectedWallet}
                  recipients={recipients}
                  isLoading={isLoading}
                  onAssetTypeChange={handleAssetTypeChange}
                  onAssetChange={setAsset}
                  onAmountChange={setAmount}
                  onTokenIdChange={setTokenId}
                  onContractAddressChange={setContractAddress}
                  onRecipientChange={setRecipient}
                  onDecimalChange={setDecimal}
                  onRemoveRecipient={handleRemoveRecipient}
                  onStepChange={setCurrentStep}
                  onSendTransaction={handleSendTransaction}
                />
              </CardContent>
            </Card>
            ) : (
              <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 px-4 py-8 text-center text-slate-400 text-sm">
                Open this page from a wallet dashboard, or go to{" "}
                <Link to="/wallet-selector" className="text-purple-400 font-medium hover:underline">
                  wallet selector
                </Link>
                .
              </div>
            )}
          </TabsContent>

          <TabsContent value="bitcoin" className="mt-5 sm:mt-6 outline-none">
            <BtcSendPanel />
          </TabsContent>
        </Tabs>
      </div>
    </WalletLayout>
  );
};

export default SendAssets;
