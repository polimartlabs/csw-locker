import { Badge } from "@/components/ui/badge";
import { Send, Image } from "lucide-react";
import PrimaryButton from "@/components/ui/primary-button";
import SecondaryButton from "@/components/ui/secondary-button";
import { SmartWallet } from "@/services/interfaces";

interface SelectedWallet extends SmartWallet {
  address: string;
}

interface TransactionSummaryStepProps {
  assetType: 'ft' | 'nft';
  asset: string;
  amount: string;
  tokenId: string;
  contractAddress: string;
  recipient: string;
  selectedWallet: Partial<SelectedWallet> | null;
  isLoading: boolean;
  onSend: () => void;
  onBack: () => void;
}

const TransactionSummaryStep = ({
  assetType,
  asset,
  amount,
  tokenId,
  contractAddress,
  recipient,
  selectedWallet,
  isLoading,
  onSend,
  onBack
}: TransactionSummaryStepProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Transaction Summary</h3>

      <div className="bg-slate-700/30 p-4 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Asset Type:</span>
          <Badge variant={assetType === 'ft' ? 'default' : 'secondary'}>
            {assetType === 'ft' ? 'FT' : 'NFT'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-400">Asset:</span>
          <span className="hidden md:block text-white text-xs break-all">{asset}</span>
          <span className="block md:hidden text-white text-xs break-all">{`${asset.slice(0, 4)}...${asset.slice(-10)}`}</span>
        </div>

        {assetType === 'ft' ? (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Amount:</span>
            <span className="text-white">{amount}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Token ID:</span>
              <span className="text-white">#{tokenId}</span>
            </div>
            <div className="flex justify-between items-center break-words">
              <span className="text-slate-400">Contract:</span>
              <span className="hidden md:block text-white text-xs break-all">{contractAddress}</span>
              <span className="block md:hidden text-white text-xs break-all">{`${contractAddress.slice(0, 4)}...${contractAddress.slice(-10)}`}</span>
            </div>
          </>
        )}

        <div className="flex justify-between items-center break-words">
          <span className="text-slate-400">From:</span>
          <span className="hidden md:block text-white text-xs break-all">{selectedWallet?.address}</span>
          <span className="block md:hidden text-white text-xs break-all">{`${selectedWallet?.address.slice(0, 4)}...${selectedWallet?.address.slice(-10)}`}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-400">To:</span>
          <span className="hidden md:block text-white text-xs break-all">{recipient}</span>
          <span className="block md:hidden text-white text-xs break-all">{`${recipient.slice(0, 6)}...${recipient.slice(-4)}`}</span>
        </div>

        <div className="border-t border-slate-600 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Transaction Fee:</span>
            <span className="text-white">0.001 STX</span>
          </div>
          {assetType === 'ft' && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-slate-400">Total Amount:</span>
              <span className="text-white">{amount} + 0.001 STX</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <SecondaryButton
          className="flex-1"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </SecondaryButton>
        <PrimaryButton
          className="flex-1"
          disabled={isLoading}
          onClick={onSend}
        >
          {assetType === 'nft' ? <Image className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
          {isLoading ? 'Sending...' : `Send ${assetType === 'nft' ? 'NFT' : 'Transaction'}`}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default TransactionSummaryStep;
