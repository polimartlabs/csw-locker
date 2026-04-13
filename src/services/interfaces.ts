// Account Balance Types
export interface StxResponseBalance {
  balance: string;
  estimated_balance: string;
  pending_balance_inbound: string;
  pending_balance_outbound: string;
  total_sent: string;
  total_received: string;
  total_fees_sent: string;
  total_miner_rewards_received: string;
  lock_tx_id: string;
  locked: string;
  lock_height: number;
  burnchain_lock_height: number;
  burnchain_unlock_height: number;
}

export interface FtResponseBalance {
  balance: string;
  total_sent: string;
  total_received: string;
  asset_identifier: string;
}

export interface NftResponseBalance {
  count: string;
  total_sent: string;
  total_received: string;
  asset_identifier: string;
}

export interface AddressUnlockSchedule {
  amount: string;
  block_height: number;
}

export interface AddressTokenOfferingLocked {
  total_locked: string;
  total_unlocked: string;
  unlock_schedule: AddressUnlockSchedule[];
}

export interface AddressBalanceResponse {
  stx: StxResponseBalance;
  fungible_tokens: Record<string, Omit<FtResponseBalance, "asset_identifier">>;
  non_fungible_tokens: Record<
    string,
    Omit<NftResponseBalance, "asset_identifier">
  >;
  token_offering_locked?: AddressTokenOfferingLocked;
}

export interface FungibleType {
  umicro: string;
  balance: string;
  decimal: number;
  name: string;
  symbol: string;
  icon: string;
  contract: string;
  asset_identifier: string;
}

export interface AccountBalanceType {
  raw: AddressBalanceResponse;
  ft: FtResponseBalance[];
  nft: NftResponseBalance[];
  stx: FungibleType;
  sbtc: FungibleType;
}

// NFT Types
export interface metaDataType {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface nftAssetType {
  asset_identifier: string;
  value: {
    hex: string;
    repr: string;
  };
  block_height: number;
  tx_id: string;
}

export interface nftInfoType {
  count: number | string;
  token_uri: string;
  metadata: metaDataType;
  assets: Promise<nftAssetType[]>;
}

// FT Types
export interface ftInfoType {
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
  token_uri: string;
  description: string;
  image_uri: string;
  image_canonical_uri: string;
  tx_id: string;
  sender_address: string;
  symbol_key: string;
  image_thumbnail_uri: string;
  metadata_uri: string;
  metadata_hash: string;
  asset_identifier: string;
}

// Transaction Types
export interface TransactionParams {
  from: string;
  to: string;
  amount: string;
  asset: string;
  assetType: "ft" | "nft";
  tokenId?: string;
  contractAddress?: string;
}

export interface Recipient {
  address: string;
  lastSent: string;
  frequency: number;
}

// Smart Wallet Types
export interface SmartWallet {
  label: string; // Display label for the wallet
  id: number; // Unique identifier for the wallet
  name: string; // Name of the wallet contract
  contractId: string; // Full contract identifier (address.name)
  ext: boolean; // Whether the wallet has extensions
  stxHolding: number; // STX balance held by the wallet
  btcHolding: number; // BTC balance held by the wallet
  extensions: string[]; // Array of extension contract names
  createdAt: string; // ISO timestamp of when the wallet was created
}

export interface WalletActivity {
  id: string;
  type: string;
  amount: string;
  asset: string;
  timestamp: string;
  status: string;
  txHash: string;
}

// Extension Types
export type ExtensionCallParams = {
  action: string;
  extension: string;
  "amount-ustx": number;
  decimal: number;
  "delegate-to": string;
  "until-burn-ht": number;
  "pox-addr": {
    version: string;
    hashbytes: string;
  };
};

// Transaction Data Service Types
export type TxAssetInfo = {
  amount: string;
  name: string;
  asset: string;
  symbol: string;
  recipient?: string;
};

export type TxInfo = {
  action:
    | "sent"
    | "receive"
    | "contract_call"
    | "contract_deploy"
    | "delegate_stx"
    | "transfer_wallet"
    | "deposit"
    | "withdraw";
  actor: string;
  stamp: string;
  time: string;
  assets: TxAssetInfo[];
  tx: string;
  tx_status: "pending" | "confirmed" | "failed";
  tx_type?: string;
};

// Metadata Types
export type GetFungibleTokenMeta = ftInfoType | null;
export type GetNoneFungibleTokenMeta = nftInfoType | null;

// Charisma API Types
export interface CharismaTokenData {
  tokenId: string;
  symbol: string;
  name: string;
  decimals: number;
  image: string;
  usdPrice: number;
  sbtcRatio: number;
  confidence: number;
  lastUpdated: number;
  totalLiquidity: number;
  isLpToken: boolean;
  intrinsicValue: number;
  marketPrice: number;
}

export interface CharismaResponseMetadata {
  processingTimeMs: number;
  includeDetails: boolean;
  lakehouseData: boolean;
  lastUpdated: string;
}

export interface CharismaApiResponse {
  status: "success" | "error";
  data: CharismaTokenData;
  metadata: CharismaResponseMetadata;
}

// NFT Metadata from Hiro API
export interface NftMetadataResponse {
  token_uri?: string;
  metadata?: {
    sip?: number;
    name?: string;
    description?: string;
    image?: string;
    cached_image?: string;
    cached_thumbnail_image?: string;
    attributes?: Array<{
      trait_type: string;
      display_type?: string;
      value: any;
    }>;
    properties?: Record<string, any>;
    localization?: {
      uri: string;
      default: string;
      locales: string[];
    };
  };
}

// Contract Types
export interface ContractResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ContractInfoEntry {
  name: string;
  label: string;
  icon: string;
  description: string;
  ext: boolean;
  isDeployed: boolean;
}

export interface ContractInfo {
  [key: string]: ContractInfoEntry;
}

export type SmartWalletContractInfo = {
  name: string;
  label: string;
  icon: string;
  description: string;
  ext: boolean;
  isDeployed: boolean;
};

// Wallet Types
export type WalletType = {
  label: string;
  id: number;
  name: string;
  contractId: string;
  ext: boolean;
  stxHolding: number;
  btcHolding: number;
  extensions: string[];
  createdAt: string;
};
