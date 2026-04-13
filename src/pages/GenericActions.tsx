import WalletLayout from "@/components/WalletLayout";
import ExtensionSelector from "@/components/extensions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PrimaryButton from "@/components/ui/primary-button";
import SecondaryButton from "@/components/ui/secondary-button"; // Add this import if not present
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContractType, getVerifiedContracts } from "@/data/walletTypes";
import { useSelectedWallet } from "@/hooks/useSelectedWallet";
import useSmartWalletContractService from "@/hooks/useSmartWalletContractService";
import { CheckCircle, Puzzle, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const GenericActions = () => {
  const { walletId } = useParams<{ walletId: `${string}.${string}` }>()
  const { extensions } = useSmartWalletContractService(walletId?.split('.')[0])
  const [extensionIndex, setExtensionIndex] = useState<number>(0)

  return (
    <WalletLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Extension</h1>
          <p className="text-slate-400">Execute actions from deployed extension contracts using your Smart Wallet.</p>
          {walletId && (
            <>
              <p className="text-sm text-purple-300 mt-2 hidden md:block whitespace-nowrap">
                Wallet: {walletId}
              </p>
              <p className="text-sm text-purple-300 mt-2 block md:hidden whitespace-nowrap">
                Wallet: {`${walletId.slice(0, 4)}...${walletId.slice(-10)}`}
              </p>
            </>
          )}
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Puzzle className="mr-2 h-5 w-5 text-purple-400" />
              {extensions[extensionIndex]?.label ?? 'NA'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ExtensionSelector extensionInfo={extensions?.[extensionIndex]} />
          </CardContent>
        </Card>

        {/* This will be updated later for extensoins */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Wallet Extensions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">

              {extensions.map((ext, i) => (
                <SecondaryButton key={i} onClick={() => setExtensionIndex(i)} className="h-auto text-left flex-col">
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-lg">{ext.icon}</span>
                    <span className="text-sm text-slate-200">{ext.name}</span>
                  </div>

                  <p className="text-slate-300 text-sm mb-3 break-words whitespace-normal">
                    {ext.description || 'Extension contract for enhanced functionality'}
                  </p>

                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm text-green-400">{ext.stxHolding} STX</span>
                    <span className="text-sm text-green-400">{ext.btcHolding} sBTC</span>
                  </div>
                </SecondaryButton>
              ))}

            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/20 border-blue-700/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <h3 className="text-blue-300 font-medium">Action Guidelines</h3>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Ensure parameters are properly formatted as JSON</li>
                <li>• Double-check recipient addresses before executing</li>
                <li>• Some actions may require additional confirmations</li>
                <li>• Transaction fees will apply for all actions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </WalletLayout>
  );
};

export default GenericActions;
