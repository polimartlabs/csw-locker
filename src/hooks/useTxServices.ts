import { useToast } from "@/hooks/use-toast";
import {
  ExtensionCallParams,
  TransactionParams,
  TxServices,
} from "@/services/txServices";
import { TransactionResult } from "@stacks/connect/dist/types/methods";
import { useCallback, useState } from "react";

/**
 * Custom hook for managing transaction services
 * Provides methods for sending transactions, calling extensions, and managing contracts
 */
export const useTxServices = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const txServices = new TxServices();

  /**
   * Send a transaction (token or NFT)
   */
  const sendTransaction = useCallback(
    async (params: TransactionParams): Promise<TransactionResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await txServices.sendTransaction(params);

        toast({
          title: "Transaction Sent",
          description: `Transaction submitted successfully`,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to send transaction";
        setError(errorMessage);

        toast({
          title: "Transaction Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * Call an extension contract
   */
  const callExtensionContract = useCallback(
    async (
      walletId: `${string}.${string}`,
      params: ExtensionCallParams
    ): Promise<void | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await txServices.callExtensionContract(walletId, params);

        toast({
          title: "Extension Call Sent",
          description: `Extension contract call submitted successfully`,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to call extension contract";
        setError(errorMessage);

        toast({
          title: "Extension Call Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * Deploy a contract
   */
  const deployContract = useCallback(
    async (params: any): Promise<void | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await txServices.deployContract(params);

        if (result) {
          toast({
            title: "Contract Deployed",
            description: `Contract deployment submitted successfully`,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to deploy contract";
        setError(errorMessage);

        toast({
          title: "Deployment Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * Add an admin to a contract
   */
  const addAdmin = useCallback(
    async (params: {
      contractAddress: string;
      adminAddress: string;
    }): Promise<TransactionResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await txServices.addAdmin(params);

        toast({
          title: "Admin Added",
          description: `Admin ${params.adminAddress} added successfully`,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to add admin";
        setError(errorMessage);

        toast({
          title: "Add Admin Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * Transfer ownership of a contract
   */
  const transferOwnership = useCallback(
    async (params: {
      contractAddress: string;
      newOwnerAddress: string;
    }): Promise<TransactionResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await txServices.transferOwnership(params);

        toast({
          title: "Ownership Transferred",
          description: `Ownership transferred to ${params.newOwnerAddress}`,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to transfer ownership";
        setError(errorMessage);

        toast({
          title: "Transfer Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * Deposit STX to a contract
   */
  const deposit = useCallback(
    async (params: {
      from: string;
      to: string;
      amount: string;
      asset: string;
      assetType: "ft" | "nft";
      tokenId?: string;
      contractAddress?: string;
      decimal: number;
    }): Promise<{ txid: string } | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await txServices.deposit(params);

        toast({
          title: "STX Deposited",
          description: `${params.amount} STX deposited successfully`,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to deposit STX";
        setError(errorMessage);

        toast({
          title: "Deposit Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * Check if an address is an admin of a contract
   */
  const isAdmin = useCallback(
    async (address: string, contractId: string): Promise<boolean> => {
      try {
        const result = await txServices.isAdmin(address, contractId);
        return result;
      } catch (error) {
        return false;
      }
    },
    []
  );

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,

    // Actions
    sendTransaction,
    callExtensionContract,
    deployContract,
    addAdmin,
    transferOwnership,
    deposit,
    isAdmin,
    clearError,
  };
};
