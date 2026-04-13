import WalletContractDetails from "@/components/WalletContractDetails";
import WalletLayout from "@/components/WalletLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GreenButton from "@/components/ui/green-button";
import { Input } from "@/components/ui/input";
import PrimaryButton from "@/components/ui/primary-button";
import RedButton from "@/components/ui/red-button";
import SecondaryButton from "@/components/ui/secondary-button"; // Add this import if not present
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import useContractDetails from "@/hooks/useContractDetails";
import { useTxServices } from "@/hooks/useTxServices";
import { handleCCS } from "@/services/smartWalletContractService";
import { formatAbi } from "@/utils/formatAbi";
import { formatNumber } from "@/utils/numbers";
import { ChainId } from "@stacks/network";
import { Check, Copy, FileText, Plus, Settings, Trash2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

type WalletInfo = {
  smart_contract?: {
    contract_id?: string;
    tx_sender?: string;
  };
  owner?: string;
  balance?: string | number;
  block_time_iso?: string;
};

const WalletDetails = () => {
  const { walletId } = useParams<{ walletId: `${string}.${string}` }>();
  const [searchParams] = useSearchParams();
  const { addAdmin, transferOwnership } = useTxServices()
  const { toast } = useToast();

  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [owner, setOwner] = useState("");
  const [adminInput, setAdminInput] = useState("");
  const [newOwnerInput, setNewOwnerInput] = useState("");
  const [copiedField, setCopiedField] = useState<"contractId" | "owner" | null>(
    null
  );
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "addAdmin" | "transferOwnership" | null
  >(null);

  // Function to close modals and reset signing state
  const closeModals = () => {
    setShowAdminModal(false);
    setShowTransferModal(false);
    setIsSigning(false);
    setTransactionType(null);
    setAdminInput("");
    setNewOwnerInput("");
  };
  // Get contract owner principal (address before the first dot)
  const contractOwner = walletId ? walletId.split(".")[0] : "";
  const { stxBalance } = useAccountBalanceService(walletId);

  const { contractDetails, contractAbi, contractDetailsErr } = useContractDetails(walletId)

  useEffect(() => {
    const fetchWalletInfo = async () => {
      if (!walletId) return;
      const info = await handleCCS(walletId, walletId, true);
      setWalletInfo({
        ...info,
        smart_contract: info.smart_contract,
        owner: contractOwner,
        balance: stxBalance.balance ?? "-",
        block_time_iso: info.block_time_iso,
      });
      setOwner(contractOwner);
    };
    fetchWalletInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId, searchParams, stxBalance]);


  const handleTransaction = async () => {
    setIsSigning(true);
    if (transactionType === "addAdmin") {
      if (!walletId || !adminInput) {
        setIsSigning(false);
        return;
      }

      try {
        const result = await addAdmin({
          contractAddress: walletId,
          adminAddress: adminInput,
        });
        if (result) {
          toast({
            title: "Admin Added",
            description: `Successfully added admin: ${adminInput}`,
            variant: "default",
          });
        }
        closeModals();
      } catch (error) {
        console.error("Error adding admin:", error);
        toast({
          title: "Error",
          description: "Failed to add admin. Please try again.",
          variant: "destructive",
        });
        closeModals();
      }
    } else if (transactionType === "transferOwnership") {
      if (!walletId || !newOwnerInput) {
        setIsSigning(false);
        return;
      }
      try {
        const result = await transferOwnership({
          contractAddress: walletId,
          newOwnerAddress: newOwnerInput,
        });
        if (result) {
          toast({
            title: "Ownership Transferred",
            description: `Ownership transferred to: ${newOwnerInput}`,
            variant: "default",
          });
        }
        closeModals();
      } catch (error) {
        console.error("Error transferring ownership:", error);
        toast({
          title: "Error",
          description: "Failed to transfer ownership. Please try again.",
          variant: "destructive",
        });
        closeModals();
      }
    }
  };

  const handleCopy = (value: string, field: "contractId" | "owner") => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1200);
  };

  return (
    <WalletLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Wallet Details</h1>
          <p className="text-slate-400 text-sm sm:text-base">
            <span className="hidden sm:inline">Manage your smart wallet configuration and extensions.</span>
            <span className="sm:hidden">Manage wallet configuration and extensions.</span>
          </p>
        </div>

        {/* Wallet Information */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center text-lg sm:text-xl">
              <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              <span className="hidden sm:inline">
                {/* {walletInfo?.smart_contract?.contract_id || walletId || */}
                Personal Wallet
              </span>
              <span className="sm:hidden">Smart Wallet</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 text-xs sm:text-sm">Contract ID</label>
                <div className="flex items-center mt-1">
                  <div className="text-white font-mono text-xs sm:text-sm bg-slate-700/50 p-2 rounded flex-1 min-w-0">
                    <span className="block sm:hidden break-all">
                      {walletInfo?.smart_contract?.contract_id || walletId}
                    </span>
                    <span className="hidden sm:block">
                      {walletInfo?.smart_contract?.contract_id || walletId}
                    </span>
                  </div>
                  <button
                    className="ml-2 p-1 rounded hover:bg-slate-600 transition-colors flex-shrink-0"
                    onClick={() =>
                      handleCopy(
                        walletInfo?.smart_contract?.contract_id ||
                        walletId ||
                        "",
                        "contractId"
                      )
                    }
                    aria-label="Copy Contract ID"
                  >
                    {copiedField === "contractId" ? (
                      <Check
                        className="text-green-400 animate-pulse"
                        size={16}
                      />
                    ) : (
                      <Copy className="text-slate-400" size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-xs sm:text-sm">Owner</label>
                <div className="flex items-center mt-1">
                  <div className="text-white font-mono text-xs sm:text-sm bg-slate-700/50 p-2 rounded flex-1 min-w-0">
                    <span className="block sm:hidden break-all">
                      {walletInfo?.owner || owner}
                    </span>
                    <span className="hidden sm:block">
                      {walletInfo?.owner || owner}
                    </span>
                  </div>
                  <button
                    className="ml-2 p-1 rounded hover:bg-slate-600 transition-colors flex-shrink-0"
                    onClick={() =>
                      handleCopy(walletInfo?.owner || owner || "", "owner")
                    }
                    aria-label="Copy Owner"
                  >
                    {copiedField === "owner" ? (
                      <Check
                        className="text-green-400 animate-pulse"
                        size={16}
                      />
                    ) : (
                      <Copy className="text-slate-400" size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-xs sm:text-sm">Balance</label>
                <div className="text-white font-semibold bg-slate-700/50 p-2 rounded mt-1 text-sm sm:text-base">
                  {walletInfo && walletInfo.balance !== undefined
                    ? `${formatNumber(Number(walletInfo.balance), 2)} STX`
                    : "-"}
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-xs sm:text-sm">Created</label>
                <div className="text-white bg-slate-700/50 p-2 rounded mt-1 text-xs sm:text-sm">
                  {walletInfo?.block_time_iso
                    ? new Date(walletInfo.block_time_iso).toLocaleString()
                    : "-"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Wallet Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <GreenButton asChild>
                <a href={`/dashboard/${walletId}`}>Open Dashboard</a>
              </GreenButton>
              <RedButton
                onClick={() => {
                  setTransactionType("transferOwnership");
                  setShowTransferModal(true);
                }}
                disabled={isSigning}
              >
                Transfer Ownership
              </RedButton>
              <RedButton
                onClick={() => {
                  setTransactionType("addAdmin");
                  setShowAdminModal(true);
                }}
                disabled={isSigning}
              >
                Add Admin
              </RedButton>
            </div>
          </CardContent>
        </Card>

        {/* Add Admin Modal */}
        <Dialog open={showAdminModal} onOpenChange={(open) => {
          if (!open && !isSigning) {
            closeModals();
          }
        }}>
          <DialogContent className="bg-slate-800/90 border text-white border-slate-700 shadow-xl">
            <DialogHeader>
              <DialogTitle>Add Admin Principal</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Admin principal..."
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                className="bg-slate-700/50 text-white px-2 py-1 rounded border border-slate-600 focus:outline-none"
                disabled={isSigning}
              />
            </div>
            <DialogFooter>
              <SecondaryButton
                variant="outline"
                onClick={handleTransaction}
                disabled={!adminInput || isSigning}
              >
                {isSigning ? "Waiting for signature..." : "Add Admin & Sign"}
              </SecondaryButton>
              <Button
                variant="ghost"
                onClick={closeModals}
                disabled={isSigning}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Ownership Modal */}
        <Dialog open={showTransferModal} onOpenChange={(open) => {
          if (!open && !isSigning) {
            closeModals();
          }
        }}>
          <DialogContent className="bg-slate-800/90 border text-white border-slate-700 shadow-xl">
            <DialogHeader>
              <DialogTitle>Transfer Ownership</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="New owner principal..."
                value={newOwnerInput}
                onChange={(e) => setNewOwnerInput(e.target.value)}
                className="bg-slate-700/50 text-white px-2 py-1 rounded border border-slate-600 focus:outline-none"
                disabled={isSigning}
              />
            </div>
            <DialogFooter>
              <SecondaryButton
                variant="outline"
                onClick={handleTransaction}
                disabled={!newOwnerInput || isSigning}
              >
                {isSigning ? "Waiting for signature..." : "Transfer & Sign"}
              </SecondaryButton>
              <Button
                variant="ghost"
                onClick={closeModals}
                disabled={isSigning}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <WalletContractDetails walletId={walletId!} />
      </div>
    </WalletLayout>
  );
};

export default WalletDetails;
