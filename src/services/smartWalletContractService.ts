import {
  type ContractType,
  CONTRACT_TYPES,
  getVerifiedContracts,
} from "@/data/walletTypes";
import { getClientConfig } from "@/utils/chain-config";
import type { Transaction } from "@stacks/stacks-blockchain-api-types";
import axios from "axios";
import { SmartWallet, WalletType } from "./interfaces";

/**
 * Standard name for smart wallet contracts
 * @constant smartWalletName
 */
export const smartWalletName = "smart-wallet";

/**
 * Interface for contract result data from the API
 * @interface ContractResult
 */
export interface ContractResult {
  status: string; // Deployment status of the contract
  tx_id: string; // Transaction ID of the deployment
  contract_id: string; // Full contract identifier
  block_height: number; // Block height where contract was deployed
}

/**
 * Interface for individual contract info entry
 * @interface ContractInfoEntry
 */
export interface ContractInfoEntry {
  found: boolean; // Whether the contract was found
  result: ContractResult; // Contract deployment result
}

/**
 * Interface for contract info response structure
 * @interface ContractInfo
 */
export interface ContractInfo {
  contractInfo: {
    [contractName: string]: ContractInfoEntry;
  };
}

/**
 * Type for the contract information returned by handleCCS function
 * @type SmartWalletContractInfo
 */
export type SmartWalletContractInfo = {
  found: boolean; // Whether the contract was found
  result?: ContractResult; // Contract deployment result
  smart_contract?: {
    // Smart contract details
    contract_id: string; // Full contract identifier
    tx_sender?: string; // Address that deployed the contract
  };
  tx_index?: number; // Transaction index
  block_time_iso?: string; // ISO timestamp of deployment
  tx_id?: string; // Transaction ID
  tx_info?: Transaction; // Full transaction details
};

/**
 * Handles Contract Check and Status (CCS) - Fetches smart contract deployment status
 * and optionally retrieves full transaction details
 *
 * @param address - The wallet address to determine the correct API endpoint
 * @param contractId - The full contract identifier (address.contract-name)
 * @param txinfo - Whether to fetch full transaction details
 * @returns Promise resolving to contract information with deployment status
 */
export const handleCCS = async (
  address: string,
  contractId: string,
  txinfo: boolean
): Promise<SmartWalletContractInfo> => {
  let contractInfo: SmartWalletContractInfo;

  try {
    // Get the appropriate API configuration based on the address
    const { api } = getClientConfig(address);

    // Fetch contract deployment status from the Stacks API
    const statusData = (
      await axios.get(
        `${api}/extended/v2/smart-contracts/status?contract_id=${contractId}`
      )
    ).data;

    // Extract contract info for the specific contract ID
    contractInfo = statusData?.[contractId];

    // If contract was found and transaction info is requested, fetch full transaction details
    if (contractInfo?.result && txinfo) {
      const tx_info: Transaction = (
        await axios.get(`${api}/extended/v1/tx/${contractInfo?.result?.tx_id}`)
      ).data;

      // Merge transaction info with contract info
      contractInfo = { ...contractInfo, ...tx_info };
    }
  } catch (error) {
    // Return a safe default when API call fails
    contractInfo = { found: false };
  }

  return contractInfo;
};
/**
 * Constructs a wallet object from contract response data and wallet type configuration
 *
 * @param wr - Contract response data from the API
 * @param wallets - Wallet type configuration containing default values
 * @returns Constructed wallet object with all required properties
 */
export const constructContractValues = (
  wr: any,
  wallets: ContractType
): SmartWallet => {
  const w: SmartWallet = {
    id: wr.tx_index, // Use transaction index as unique ID
    name: wr.smart_contract.contract_id.split(".")[1], // Extract contract name from full ID
    contractId: wr.smart_contract.contract_id, // Full contract identifier
    stxHolding: 0, // Initialize STX balance to 0
    btcHolding: 0, // Initialize BTC balance to 0
    label: wallets.label, // Display label
    ext: wallets.ext, // Extension flag
    extensions: [], // Initialize extensions array
    createdAt: wr.block_time_iso, // Set creation timestamp
  };
  return w;
};

/**
 * Service class for managing smart wallet contract operations
 * Handles fetching and processing of smart wallet contract data
 */
export class SmartWalletContractService {
  /**
   * Retrieves all deployed smart wallets for a given wallet address
   * Checks each contract type in parallel and returns only successfully deployed wallets
   *
   * @param walletAddress - The wallet address to check for deployed contracts
   * @returns Promise resolving to array of deployed smart wallets
   */
  async getSmartWallets(walletAddress: string): Promise<SmartWallet[]> {
    // Check all contract types in parallel for better performance
    const allDeployedWallets: WalletType[] = (
      await Promise.all(
        CONTRACT_TYPES.map(async (wallets) => {
          // Construct full contract ID and check deployment status
          const wr = await handleCCS(
            walletAddress,
            `${walletAddress}.${wallets.name}`,
            true
          );

          // Skip if contract was not found/deployed
          if (!wr?.found) return null;

          // Construct wallet object from contract data
          const w = constructContractValues(wr, wallets);
          return { ...w, ...wallets };
        })
      )
    ).filter(Boolean) as SmartWallet[]; // Remove null entries (undeployed contracts)

    return allDeployedWallets;
  }

  /**
   * Retrieves only deployed extension contracts for a given wallet address
   * Utilizes getVerifiedContracts to check deployment status and filters for extensions
   *
   * @param walletAddress - The wallet address to check for deployed extension contracts
   * @returns Promise resolving to array of deployed extension contracts
   */
  async getSmartWalletExtensionContracts(
    walletAddress: string
  ): Promise<ContractType[]> {
    try {
      // Get all verified contracts with deployment status
      const verifiedContracts = await getVerifiedContracts(walletAddress);

      // Filter for extension contracts that are deployed
      const extensionContracts = verifiedContracts.filter(
        (contract) => contract.ext === true && contract.isDeployed === true
      );

      return extensionContracts;
    } catch (error) {
      console.error("Error retrieving extension contracts:", error);
      // Return empty array on error to prevent application crashes
      return [];
    }
  }

  async validateSmartContract(contractId: string): Promise<SmartWallet | null> {
    const wr = await handleCCS(contractId, contractId, true);

    if (!wr?.found) {
      return null;
    }

    const wallets = CONTRACT_TYPES.find(
      (info) => info?.name === contractId?.split(".")?.[1]
    );
    // Construct wallet object from contract data
    const w = constructContractValues(wr, wallets);

    return w;
  }
}
